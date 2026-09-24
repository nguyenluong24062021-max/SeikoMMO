import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderClientFactory } from '../smm/provider-client.factory';
import { OrderStatus, TransactionType } from '@repo/shared';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly ORDER_TIMEOUT_HOURS = 24;

  constructor(
    private prisma: PrismaService,
    private providerClientFactory: ProviderClientFactory,
  ) {}

  /**
   * Cron job runs every 5 minutes to deactivate expired flash sales
   * Logs the number of remaining slots for each deactivated sale
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async deactivateExpiredFlashSales() {
    const now = new Date();

    try {
      // Find all active flash sales that have expired
      const expiredSales = await this.prisma.flashSale.findMany({
        where: {
          isActive: true,
          endAt: {
            lt: now,
          },
        },
        include: {
          product: true,
        },
      });

      if (expiredSales.length === 0) {
        this.logger.debug('No expired flash sales to deactivate');
        return;
      }

      // Deactivate each expired sale
      for (const sale of expiredSales) {
        await this.prisma.flashSale.update({
          where: { id: sale.id },
          data: { isActive: false },
        });

        const remainingSlots = sale.stockCap - sale.soldCount;
        this.logger.log(
          `Deactivated flash sale: ${sale.product.name} (ID: ${sale.id}) - ` +
          `Sold: ${sale.soldCount}/${sale.stockCap}, Remaining slots: ${remainingSlots}`,
        );
      }

      this.logger.log(
        `Successfully deactivated ${expiredSales.length} expired flash sale(s)`,
      );
    } catch (error) {
      this.logger.error('Error deactivating expired flash sales', error);
    }
  }

  /**
   * Cron job runs every 2 minutes to poll PROCESSING orders with provider
   * Updates status based on provider response:
   * - completed → COMPLETED
   * - partial → PARTIAL + refund unprocessed amount
   * - failed/cancelled → CANCELLED + full refund
   * - timeout (>24h) → CANCELLED + full refund
   */
  @Cron('*/2 * * * *') // Every 2 minutes
  async pollProviderOrderStatus() {
    const now = new Date();
    const timeoutThreshold = new Date(now.getTime() - this.ORDER_TIMEOUT_HOURS * 60 * 60 * 1000);

    try {
      // Find all PROCESSING orders with providerOrderId
      const processingOrders = await this.prisma.order.findMany({
        where: {
          status: OrderStatus.PROCESSING,
          providerOrderId: {
            not: null,
          },
          providerId: {
            not: null,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (processingOrders.length === 0) {
        this.logger.debug('No PROCESSING orders to poll');
        return;
      }

      this.logger.log(`Polling ${processingOrders.length} PROCESSING order(s)`);

      for (const order of processingOrders) {
        try {
          // Check for timeout (>24h old)
          if (order.createdAt < timeoutThreshold) {
            await this.handleTimedOutOrder(order);
            continue;
          }

          // Get provider and client
          const provider = await this.prisma.smmProvider.findUnique({
            where: { id: order.providerId! },
          });

          if (!provider) {
            this.logger.error(`Provider not found for order ${order.id}`);
            continue;
          }

          const client = this.providerClientFactory.create(provider);

          // Poll status from provider
          const statusResponse = await client.getOrderStatus(order.providerOrderId!);

          this.logger.debug(
            `Order ${order.id}: status=${statusResponse.status}, remains=${statusResponse.remains}`
          );

          // Handle based on status
          if (statusResponse.status === 'completed') {
            await this.handleCompletedOrder(order);
          } else if (statusResponse.status === 'partial') {
            await this.handlePartialOrder(order, statusResponse.quantity ?? 0, statusResponse.remains ?? 0);
          } else if (statusResponse.status === 'failed' || statusResponse.status === 'cancelled') {
            await this.handleFailedOrder(order);
          }
          // If still pending/processing, do nothing and wait for next poll
        } catch (error: any) {
          this.logger.error(
            `Error polling order ${order.id}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error in pollProviderOrderStatus cron', error);
    }
  }

  /**
   * Handle completed order: mark as COMPLETED
   */
  private async handleCompletedOrder(order: any) {
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.COMPLETED,
        processedQuantity: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        processingStatus: 'Order completed successfully',
      },
    });

    this.logger.log(`Order ${order.id} marked as COMPLETED`);
  }

  /**
   * Handle partial order: update processedQuantity and refund unprocessed amount
   */
  private async handlePartialOrder(order: any, processedQuantity: number, remains: number) {
    const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const processedRatio = processedQuantity / totalQuantity;
    const unprocessedRatio = 1 - processedRatio;
    const refundAmount = Math.floor((order.totalAmount - order.discountAmount) * unprocessedRatio);

    await this.prisma.$transaction(async (tx: any) => {
      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PARTIAL,
          processedQuantity,
          processingStatus: `Partially completed: ${processedQuantity}/${totalQuantity} processed, ${remains} remaining`,
        },
      });

      // Refund buyer
      const buyerWallet = await tx.wallet.findUnique({
        where: { userId: order.buyerId },
      });

      if (buyerWallet) {
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { balance: { increment: refundAmount } },
        });

        await tx.transaction.create({
          data: {
            walletId: buyerWallet.id,
            orderId: order.id,
            amount: refundAmount,
            type: TransactionType.REFUND,
            status: 'COMPLETED',
            description: `Partial refund for order ${order.id}: ${Math.round(unprocessedRatio * 100)}% unprocessed (${remains} remaining)`,
          },
        });
      }
    });

    this.logger.log(
      `Order ${order.id} marked as PARTIAL: ${processedQuantity}/${totalQuantity} processed, refunded ${refundAmount} VND`
    );
  }

  /**
   * Handle failed/cancelled order: full refund
   */
  private async handleFailedOrder(order: any) {
    const refundAmount = order.totalAmount - order.discountAmount;

    await this.prisma.$transaction(async (tx: any) => {
      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          processingStatus: 'Order failed or cancelled by provider',
        },
      });

      // Refund buyer
      const buyerWallet = await tx.wallet.findUnique({
        where: { userId: order.buyerId },
      });

      if (buyerWallet) {
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { balance: { increment: refundAmount } },
        });

        await tx.transaction.create({
          data: {
            walletId: buyerWallet.id,
            orderId: order.id,
            amount: refundAmount,
            type: TransactionType.REFUND,
            status: 'COMPLETED',
            description: `Full refund for cancelled order ${order.id}: Provider reported failure`,
          },
        });
      }
    });

    this.logger.log(`Order ${order.id} marked as CANCELLED with full refund: ${refundAmount} VND`);
  }

  /**
   * Handle timed out order (>24h): cancel and full refund
   */
  private async handleTimedOutOrder(order: any) {
    const refundAmount = order.totalAmount - order.discountAmount;

    await this.prisma.$transaction(async (tx: any) => {
      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          processingStatus: `Order timed out after ${this.ORDER_TIMEOUT_HOURS}h without completion`,
        },
      });

      // Refund buyer
      const buyerWallet = await tx.wallet.findUnique({
        where: { userId: order.buyerId },
      });

      if (buyerWallet) {
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { balance: { increment: refundAmount } },
        });

        await tx.transaction.create({
          data: {
            walletId: buyerWallet.id,
            orderId: order.id,
            amount: refundAmount,
            type: TransactionType.REFUND,
            status: 'COMPLETED',
            description: `Full refund for timed out order ${order.id}: Exceeded ${this.ORDER_TIMEOUT_HOURS}h timeout`,
          },
        });
      }
    });

    this.logger.log(`Order ${order.id} timed out and cancelled with full refund: ${refundAmount} VND`);
  }
}
