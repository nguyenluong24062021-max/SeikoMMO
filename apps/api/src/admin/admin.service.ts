import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrderDto,
  PayoutDto,
  AdminOrderQueryDto,
  AdminPayoutQueryDto,
  ApprovePayoutDto,
  OrderStatus,
  PayoutStatus,
} from '@repo/shared';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Orders Management
  async getAllOrders(queryDto: AdminOrderQueryDto): Promise<{
    orders: OrderDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          buyer: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map(this.mapToOrderDto),
      total,
      page,
      limit,
    };
  }

  async getOrder(id: string): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                type: true,
                price: true,
              },
            },
          },
        },
        stocks: {
          select: {
            id: true,
            key: true,
            status: true,
          },
        },
        disputes: {
          select: {
            id: true,
            reason: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapToOrderDto(order);
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderDto> {
    // Check if order exists
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.DELIVERED, OrderStatus.PARTIAL, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.DISPUTED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.PARTIAL]: [OrderStatus.COMPLETED, OrderStatus.DISPUTED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.DISPUTED]: [OrderStatus.COMPLETED, OrderStatus.PARTIAL, OrderStatus.CANCELLED],
    };

    const allowedNextStatuses = validTransitions[order.status] || [];
    if (!allowedNextStatuses.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${status}. Allowed: ${allowedNextStatuses.join(', ')}`,
      );
    }

    // Update order status
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return this.mapToOrderDto(updatedOrder);
  }

  // Payouts Management
  async getAllPayouts(queryDto: AdminPayoutQueryDto): Promise<{
    payouts: PayoutDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: {
          wallet: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.payout.count({ where }),
    ]);

    return {
      payouts: payouts.map(this.mapToPayoutDto),
      total,
      page,
      limit,
    };
  }

  async getPayout(id: string): Promise<PayoutDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { id },
      include: {
        wallet: {
          select: {
            userId: true,
            balance: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return this.mapToPayoutDto(payout);
  }

  async approvePayout(
    id: string,
    adminId: string,
    approveDto: ApprovePayoutDto,
  ): Promise<PayoutDto> {
    const { status, adminNote } = approveDto;

    // Check if payout exists
    const payout = await this.prisma.payout.findUnique({
      where: { id },
      include: {
        wallet: true,
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException('This payout has already been processed');
    }

    // Validate status
    if (![PayoutStatus.COMPLETED, PayoutStatus.FAILED].includes(status)) {
      throw new BadRequestException('Status must be COMPLETED or FAILED');
    }

    const now = new Date();

    // If rejecting (FAILED), refund to wallet
    if (status === PayoutStatus.FAILED) {
      await this.prisma.$transaction(async (tx) => {
        // Refund amount back to wallet
        await tx.wallet.update({
          where: { id: payout.walletId },
          data: {
            balance: { increment: payout.amount },
          },
        });

        // Create refund transaction
        await tx.transaction.create({
          data: {
            walletId: payout.walletId,
            amount: payout.amount,
            type: 'REFUND',
            status: 'COMPLETED',
            description: `Payout rejected: ${adminNote || 'No reason provided'}`,
          },
        });

        // Update payout status with resolvedBy and resolvedAt
        await tx.payout.update({
          where: { id },
          data: {
            status,
            description: `${payout.description || ''} | Admin: ${adminNote || 'Rejected'}`,
            resolvedBy: adminId,
            resolvedAt: now,
          },
        });
      });
    } else {
      // Just mark as COMPLETED (money already deducted) with resolvedBy and resolvedAt
      await this.prisma.payout.update({
        where: { id },
        data: {
          status,
          description: `${payout.description || ''} | Admin: ${adminNote || 'Approved'}`,
          resolvedBy: adminId,
          resolvedAt: now,
        },
      });
    }

    // Fetch updated payout
    const updatedPayout = await this.prisma.payout.findUnique({
      where: { id },
      include: {
        wallet: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return this.mapToPayoutDto(updatedPayout!);
  }

  // Statistics
  async getStats(): Promise<any> {
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      disputedOrders,
      totalPayouts,
      pendingPayouts,
      completedPayouts,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.COMPLETED } }),
      this.prisma.order.count({ where: { status: OrderStatus.DISPUTED } }),
      this.prisma.payout.count(),
      this.prisma.payout.count({ where: { status: PayoutStatus.PENDING } }),
      this.prisma.payout.count({ where: { status: PayoutStatus.COMPLETED } }),
      this.prisma.order.aggregate({
        where: { status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        disputed: disputedOrders,
      },
      payouts: {
        total: totalPayouts,
        pending: pendingPayouts,
        completed: completedPayouts,
      },
      revenue: {
        total: totalRevenue._sum.totalAmount || 0,
      },
    };
  }

  // Mapping functions
  private mapToOrderDto(order: any): OrderDto {
    return {
      id: order.id,
      buyerId: order.buyerId,
      buyerName: order.buyer?.name,
      totalAmount: order.totalAmount,
      status: order.status,
      providerOrderId: order.providerOrderId,
      providerId: order.providerId,
      items: order.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name,
        quantity: item.quantity,
        price: item.price,
      })) || [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private mapToPayoutDto(payout: any): PayoutDto {
    return {
      id: payout.id,
      walletId: payout.walletId,
      amount: payout.amount,
      status: payout.status,
      description: payout.description,
      resolvedBy: payout.resolvedBy,
      resolvedAt: payout.resolvedAt,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
    };
  }
}
