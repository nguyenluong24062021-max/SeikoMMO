import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { FlashSalesService } from '../flash-sales/flash-sales.service';
import { ProviderClientFactory } from '../smm/provider-client.factory';
import {
  CreateOrderDto,
  OrderDto,
  TransactionType,
  OrderStatus,
  UpdateOrderProgressDto,
  VoucherType,
  ProductType,
} from '@repo/shared';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private vouchersService: VouchersService,
    private flashSalesService: FlashSalesService,
    private providerClientFactory: ProviderClientFactory,
  ) {}

  async create(buyerId: string, createOrderDto: CreateOrderDto): Promise<OrderDto> {
    // Validate products and calculate total
    let totalAmount = 0;
    const orderItems: Array<{
      productId: string;
      quantity: number;
      price: number;
      product: any;
      sellerId: string;
      shopId: string;
      flashSaleId?: string;
      isFlashSale?: boolean;
    }> = [];

    const flashSaleUpdates: Array<{ flashSaleId: string; quantity: number }> = [];

    for (const item of createOrderDto.items) {
      const product = await this.productsService.findOne(item.productId);
      
      if (!product.isActive) {
        throw new BadRequestException(`Product ${product.name} is not active`);
      }

      if (product.availableStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${product.availableStock}, Requested: ${item.quantity}`,
        );
      }

      // Get shop to find seller
      const shop = await this.prisma.shop.findUnique({
        where: { id: product.shopId },
        select: { ownerId: true, id: true },
      });

      if (!shop) {
        throw new BadRequestException(`Shop not found for product ${product.name}`);
      }

      // Check for active flash sale
      const flashSale = await this.flashSalesService.findActiveByProductId(product.id);
      let itemPrice = product.price;
      let isFlashSale = false;
      let flashSaleId: string | undefined;

      if (flashSale) {
        // Check if flash sale has capacity
        const remaining = flashSale.stockCap - flashSale.soldCount;
        if (remaining >= item.quantity) {
          // Apply flash sale price
          itemPrice = flashSale.salePrice;
          isFlashSale = true;
          flashSaleId = flashSale.id;
          flashSaleUpdates.push({ flashSaleId: flashSale.id, quantity: item.quantity });
        } else if (remaining > 0) {
          // Partial flash sale - some items at sale price, rest at regular
          throw new BadRequestException(
            `Flash sale for ${product.name} has only ${remaining} items remaining. Please adjust quantity or purchase at regular price.`,
          );
        }
        // If remaining === 0, use regular price (flash sale exhausted)
      }

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,
        product,
        sellerId: shop.ownerId,
        shopId: shop.id,
        flashSaleId,
        isFlashSale,
      });

      totalAmount += itemPrice * item.quantity;
    }

    // Apply voucher if provided
    let discountAmount = 0;
    let voucherCode: string | undefined;
    
    if (createOrderDto.voucherCode) {
      // Check if any item is using flash sale with PERCENTAGE voucher
      const hasFlashSale = orderItems.some((item) => item.isFlashSale);
      
      const shopId = orderItems[0]?.shopId;
      const validation = await this.vouchersService.validateAndUse(
        createOrderDto.voucherCode,
        shopId,
      );

      if (!validation.valid) {
        throw new BadRequestException(validation.error || 'Invalid voucher');
      }

      const voucher = validation.voucher!;
      voucherCode = voucher.code;

      // Prevent stacking PERCENTAGE voucher with flash sale
      if (hasFlashSale && voucher.type === VoucherType.PERCENTAGE) {
        throw new BadRequestException(
          'Cannot use percentage voucher with flash sale items. Please use fixed amount voucher or purchase items separately.',
        );
      }

      // Calculate discount
      if (voucher.type === VoucherType.PERCENTAGE) {
        discountAmount = Math.floor((totalAmount * voucher.value) / 100);
      } else {
        discountAmount = voucher.value;
      }

      // Discount cannot exceed total
      if (discountAmount > totalAmount) {
        discountAmount = totalAmount;
      }
    }

    const finalAmount = totalAmount - discountAmount;

    // Check buyer has enough balance
    const buyerWallet = await this.prisma.wallet.findUnique({
      where: { userId: buyerId },
    });

    if (!buyerWallet || buyerWallet.balance < finalAmount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Required: ${finalAmount} VND, Available: ${buyerWallet?.balance || 0} VND`,
      );
    }

    // Get unique sellers and calculate commission (10% platform fee)
    const commissionRate = 10; // 10%
    const sellerPayments = new Map<string, number>();
    
    for (const item of orderItems) {
      const itemTotal = item.price * item.quantity;
      const current = sellerPayments.get(item.sellerId) || 0;
      sellerPayments.set(item.sellerId, current + itemTotal);
    }

    // Create order with wallet transactions
    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Create order
      const newOrder = await tx.order.create({
        data: {
          buyerId,
          totalAmount,
          status: OrderStatus.PENDING,
          commissionRate,
          sellerId: orderItems[0].sellerId,
          voucherCode,
          discountAmount,
          processedQuantity: 0,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
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

      // Increment voucher usage if voucher was used
      if (voucherCode) {
        await this.vouchersService.incrementUsage(voucherCode);
      }

      // Increment flash sale sold count for items purchased during flash sale
      for (const update of flashSaleUpdates) {
        await this.flashSalesService.incrementSoldCount(update.flashSaleId, update.quantity);
      }

      // 2. Deduct from buyer wallet (final amount after discount)
      await tx.wallet.update({
        where: { userId: buyerId },
        data: { balance: { decrement: finalAmount } },
      });

      // Create buyer transaction
      await tx.transaction.create({
        data: {
          walletId: buyerWallet.id,
          orderId: newOrder.id,
          amount: -finalAmount,
          type: TransactionType.PAYMENT,
          status: 'COMPLETED',
          description: `Payment for order ${newOrder.id}${voucherCode ? ` (voucher: ${voucherCode}, discount: ${discountAmount} VND)` : ''}`,
        },
      });

      // 3. Distribute to sellers with commission hold
      // Apply discount proportionally to seller payments
      const discountRatio = discountAmount > 0 ? (totalAmount - discountAmount) / totalAmount : 1;
      
      for (const [sellerId, amount] of sellerPayments.entries()) {
        const adjustedAmount = Math.floor(amount * discountRatio);
        const commissionAmount = Math.floor((adjustedAmount * commissionRate) / 100);
        const sellerAmount = adjustedAmount - commissionAmount;

        // Get or create seller wallet
        let sellerWallet = await tx.wallet.findUnique({
          where: { userId: sellerId },
        });

        if (!sellerWallet) {
          sellerWallet = await tx.wallet.create({
            data: { userId: sellerId, balance: 0 },
          });
        }

        // Add to seller wallet
        await tx.wallet.update({
          where: { id: sellerWallet.id },
          data: { balance: { increment: sellerAmount } },
        });

        // Create seller transaction with 24h hold
        const canWithdrawAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await tx.transaction.create({
          data: {
            walletId: sellerWallet.id,
            orderId: newOrder.id,
            amount: sellerAmount,
            type: TransactionType.PAYMENT,
            status: 'COMPLETED',
            description: `Sale for order ${newOrder.id} (after ${commissionRate}% commission)`,
            canWithdrawAt,
          },
        });

        // Platform commission transaction
        await tx.transaction.create({
          data: {
            walletId: sellerWallet.id,
            orderId: newOrder.id,
            amount: -commissionAmount,
            type: TransactionType.COMMISSION,
            status: 'COMPLETED',
            description: `Platform commission ${commissionRate}% for order ${newOrder.id}`,
          },
        });
      }

      // 3.5. Referral commission: If this is the buyer's first order and they were referred
      const buyer = await tx.user.findUnique({
        where: { id: buyerId },
        select: {
          referredBy: true,
          hasReceivedReferral: true,
          orders: {
            select: { id: true },
            take: 2, // Check if this is first or second order
          },
        },
      });

      // Only give referral commission on the first order
      if (buyer && buyer.referredBy && !buyer.hasReceivedReferral && buyer.orders.length === 1) {
        // Find the referrer by their referral code
        const referrer = await tx.user.findUnique({
          where: { referralCode: buyer.referredBy },
          select: {
            id: true,
            wallet: {
              select: { id: true },
            },
          },
        });

        if (referrer && referrer.wallet) {
          // Calculate 5% of total order amount (before discount)
          const referralCommission = Math.floor(totalAmount * 0.05);

          // Add commission to referrer's wallet
          await tx.wallet.update({
            where: { id: referrer.wallet.id },
            data: { balance: { increment: referralCommission } },
          });

          // Create commission transaction
          await tx.transaction.create({
            data: {
              walletId: referrer.wallet.id,
              orderId: newOrder.id,
              amount: referralCommission,
              type: TransactionType.COMMISSION,
              status: 'COMPLETED',
              description: `Referral commission (5%) from order ${newOrder.id}`,
            },
          });

          // Mark that referrer has received their commission for this user
          await tx.user.update({
            where: { id: buyerId },
            data: { hasReceivedReferral: true },
          });
        }
      }

      // 4. Allocate stock for each item and mark as SOLD
      for (const item of orderItems) {
        const availableStocks = await tx.productStock.findMany({
          where: {
            productId: item.productId,
            status: 'AVAILABLE',
          },
          take: item.quantity,
          orderBy: { createdAt: 'asc' },
        });

        if (availableStocks.length < item.quantity) {
          throw new BadRequestException(
            `Not enough stock available for ${item.product.name}`,
          );
        }

        // Mark stocks as SOLD
        await tx.productStock.updateMany({
          where: {
            id: {
              in: availableStocks.map((s) => s.id),
            },
          },
          data: {
            status: 'SOLD',
            soldAt: new Date(),
            orderId: newOrder.id,
          },
        });
      }

      // 5. Check if order contains SEEDING products and auto-place with provider
      let finalStatus = OrderStatus.DELIVERED;
      let providerOrderId: string | undefined;
      let providerId: string | undefined;

      // Check if any item is SEEDING type
      const hasSeedingProduct = orderItems.some(item => item.product.type === ProductType.SEEDING);

      if (hasSeedingProduct) {
        // For SEEDING orders, try to find active mapping and place order
        const firstSeedingItem = orderItems.find(item => item.product.type === ProductType.SEEDING);
        
        if (firstSeedingItem) {
          try {
            // Find active service mapping for this product
            const mappings = await tx.serviceMapping.findMany({
              where: {
                productId: firstSeedingItem.productId,
                isActive: true,
              },
              include: {
                provider: true,
              },
              take: 1,
            });

            if (mappings.length > 0) {
              const mapping = mappings[0];
              
              // Create provider client
              const providerClient = this.providerClientFactory.create(mapping.provider);

              // Place order with provider (link = orderId for tracking)
              const providerResponse = await providerClient.placeOrder({
                service: mapping.providerServiceId,
                link: newOrder.id, // Use orderId as link for tracking
                quantity: firstSeedingItem.quantity,
              });

              // Success: save provider info and set status to PROCESSING
              providerOrderId = providerResponse.orderId;
              providerId = mapping.providerId;
              finalStatus = OrderStatus.PROCESSING;

              this.logger.log(
                `Order ${newOrder.id} placed with provider ${mapping.provider.name}: ${providerOrderId}`
              );
            } else {
              // No active mapping found - keep DELIVERED status
              this.logger.warn(
                `No active service mapping found for SEEDING product ${firstSeedingItem.productId}`
              );
            }
          } catch (error: any) {
            // Provider failed: refund buyer and mark as CANCELLED
            this.logger.error(
              `Failed to place order ${newOrder.id} with provider: ${error.message}`
            );

            // Refund full amount to buyer
            await tx.wallet.update({
              where: { userId: buyerId },
              data: { balance: { increment: finalAmount } },
            });

            // Create refund transaction
            await tx.transaction.create({
              data: {
                walletId: buyerWallet.id,
                orderId: newOrder.id,
                amount: finalAmount,
                type: TransactionType.REFUND,
                status: 'COMPLETED',
                description: `Refund for cancelled order ${newOrder.id}: Provider error - ${error.message}`,
              },
            });

            // Deduct from sellers (reverse the payment)
            for (const [sellerId, amount] of sellerPayments.entries()) {
              const adjustedAmount = Math.floor(amount * discountRatio);
              const commissionAmount = Math.floor((adjustedAmount * commissionRate) / 100);
              const sellerAmount = adjustedAmount - commissionAmount;

              const sellerWallet = await tx.wallet.findUnique({
                where: { userId: sellerId },
              });

              if (sellerWallet) {
                await tx.wallet.update({
                  where: { id: sellerWallet.id },
                  data: { balance: { decrement: sellerAmount } },
                });
              }
            }

            finalStatus = OrderStatus.CANCELLED;
          }
        }
      }

      // 6. Update order with final status and provider info
      const paidOrder = await tx.order.update({
        where: { id: newOrder.id },
        data: {
          status: finalStatus,
          providerOrderId,
          providerId,
          processingStatus: finalStatus === OrderStatus.PROCESSING
            ? 'Order placed with provider, waiting for processing'
            : undefined,
          sellerAmount: finalStatus !== OrderStatus.CANCELLED
            ? Array.from(sellerPayments.values()).reduce((a, b) => a + b, 0) * discountRatio -
              Math.floor((Array.from(sellerPayments.values()).reduce((a, b) => a + b, 0) * discountRatio * commissionRate) / 100)
            : undefined,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          stocks: true,
        },
      });

      return paidOrder;
    });

    return this.mapToOrderDto(order);
  }

  async updateProgress(
    orderId: string,
    sellerId: string,
    updateDto: UpdateOrderProgressDto,
  ): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if user is the seller
    if (order.sellerId !== sellerId) {
      throw new ForbiddenException('You are not the seller of this order');
    }

    const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    // Validate status transition
    if (updateDto.status === OrderStatus.PARTIAL && updateDto.processedQuantity === undefined) {
      throw new BadRequestException('processedQuantity is required for PARTIAL status');
    }

    // Handle PARTIAL orders with refund
    if (updateDto.status === OrderStatus.PARTIAL && updateDto.processedQuantity! < totalQuantity) {
      const processedRatio = updateDto.processedQuantity! / totalQuantity;
      const unprocessedRatio = 1 - processedRatio;
      const refundAmount = Math.floor((order.totalAmount - order.discountAmount) * unprocessedRatio);

      await this.prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: updateDto.status,
            processedQuantity: updateDto.processedQuantity,
            processingStatus: updateDto.processingStatus || `Processed ${updateDto.processedQuantity}/${totalQuantity}`,
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
              description: `Partial refund for order ${order.id}: ${unprocessedRatio * 100}% unprocessed`,
            },
          });
        }
      });
    } else {
      // Simple status update
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: updateDto.status,
          processedQuantity: updateDto.processedQuantity || totalQuantity,
          processingStatus: updateDto.processingStatus,
        },
      });
    }

    return this.findOne(orderId, sellerId, 'SELLER');
  }

  async findAll(buyerId?: string): Promise<OrderDto[]> {
    const orders = await this.prisma.order.findMany({
      where: buyerId ? { buyerId } : undefined,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        stocks: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.mapToOrderDto(order));
  }

  async findOne(id: string, userId: string, userRole: string): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        stocks: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access: buyer, seller, or admin
    if (order.buyerId !== userId && order.sellerId !== userId && userRole !== 'ADMIN') {
      throw new NotFoundException('Order not found');
    }

    return this.mapToOrderDto(order);
  }

  private mapToOrderDto(order: any): OrderDto {
    const stocks = order.stocks || [];
    const deliveredKeys = stocks.map((s: any) => s.key);

    return {
      id: order.id,
      buyerId: order.buyerId,
      totalAmount: order.totalAmount,
      status: order.status,
      voucherCode: order.voucherCode,
      discountAmount: order.discountAmount,
      processingStatus: order.processingStatus,
      processedQuantity: order.processedQuantity,
      providerOrderId: order.providerOrderId,
      providerId: order.providerId,
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
      stocks: stocks.map((s: any) => ({
        id: s.id,
        productId: s.productId,
        key: s.key,
        status: s.status,
        soldAt: s.soldAt,
        createdAt: s.createdAt,
      })),
      deliveredKeys,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
