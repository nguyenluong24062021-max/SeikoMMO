import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import {
  CreateDisputeDto,
  UpdateDisputeDto,
  DisputeDto,
  DisputeStatus,
  OrderStatus,
  TransactionType,
} from '@repo/shared';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletsService: WalletsService,
  ) {}

  async create(userId: string, createDisputeDto: CreateDisputeDto): Promise<DisputeDto> {
    const { orderId, reason } = createDisputeDto;

    // Check if order exists and belongs to user
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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

    if (order.buyerId !== userId) {
      throw new ForbiddenException('You can only dispute your own orders');
    }

    // Check if order is eligible for dispute (must be DELIVERED or COMPLETED)
    if (!['DELIVERED', 'COMPLETED'].includes(order.status)) {
      throw new BadRequestException(
        'You can only dispute orders that have been delivered',
      );
    }

    // Check if dispute already exists for this order
    const existingDispute = await this.prisma.dispute.findFirst({
      where: {
        orderId,
        status: { in: ['OPEN', 'INVESTIGATING'] },
      },
    });

    if (existingDispute) {
      throw new BadRequestException('An active dispute already exists for this order');
    }

    // Create dispute and update order status
    const dispute = await this.prisma.$transaction(async (tx) => {
      // Update order status to DISPUTED
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DISPUTED },
      });

      // Create dispute
      const newDispute = await tx.dispute.create({
        data: {
          orderId,
          userId,
          reason,
          status: DisputeStatus.OPEN,
        },
      });

      return newDispute;
    });

    return this.mapToDisputeDto(dispute);
  }

  async findAll(
    userId: string,
    userRole: string,
    status?: DisputeStatus,
  ): Promise<DisputeDto[]> {
    const where: any = {};

    // Buyer can only see own disputes
    if (userRole !== 'ADMIN') {
      where.userId = userId;
    }

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    const disputes = await this.prisma.dispute.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return disputes.map(this.mapToDisputeDto);
  }

  async findOne(id: string, userId: string, userRole: string): Promise<DisputeDto> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            buyerId: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check access permission
    if (userRole !== 'ADMIN' && dispute.userId !== userId) {
      throw new ForbiddenException('You can only view your own disputes');
    }

    return this.mapToDisputeDto(dispute);
  }

  async resolve(
    id: string,
    adminId: string,
    updateData: UpdateDisputeDto,
  ): Promise<DisputeDto> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.INVESTIGATING) {
      throw new BadRequestException('This dispute has already been resolved');
    }

    const { status, resolution, refundAmount, adminNote } = updateData;

    // If status is RESOLVED and refundAmount provided, process refund
    if (status === DisputeStatus.RESOLVED && refundAmount) {
      const order = dispute.order;

      // Validate refund amount
      if (refundAmount <= 0 || refundAmount > order.totalAmount) {
        throw new BadRequestException(
          `Refund amount must be between 1 and ${order.totalAmount} VND`,
        );
      }

      // Process refund in transaction
      const updatedDispute = await this.prisma.$transaction(async (tx) => {
        // Refund to buyer wallet
        await this.walletsService.addBalance(
          order.buyerId,
          refundAmount,
          TransactionType.REFUND,
          `Refund for disputed order ${order.id}`,
          order.id,
          false, // No hold for refunds
        );

        // Update dispute
        const resolved = await tx.dispute.update({
          where: { id },
          data: {
            status: DisputeStatus.RESOLVED,
            resolution,
            refundAmount,
            adminNote,
            resolvedBy: adminId,
            resolvedAt: new Date(),
          },
        });

        // Update order status
        if (refundAmount === order.totalAmount) {
          // Full refund = CANCELLED
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.CANCELLED },
          });
        } else {
          // Partial refund = PARTIAL
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.PARTIAL },
          });
        }

        return resolved;
      });

      return this.mapToDisputeDto(updatedDispute);
    }

    // Just update dispute status without refund
    const updatedDispute = await this.prisma.dispute.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(resolution && { resolution }),
        ...(adminNote && { adminNote }),
        resolvedBy: adminId,
        resolvedAt: new Date(),
      },
    });

    // Update order status if rejected
    if (status === DisputeStatus.REJECTED) {
      await this.prisma.order.update({
        where: { id: dispute.orderId },
        data: { status: OrderStatus.COMPLETED },
      });
    }

    return this.mapToDisputeDto(updatedDispute);
  }

  private mapToDisputeDto(dispute: any): DisputeDto {
    return {
      id: dispute.id,
      orderId: dispute.orderId,
      userId: dispute.userId,
      reason: dispute.reason,
      status: dispute.status,
      resolution: dispute.resolution,
      refundAmount: dispute.refundAmount,
      adminNote: dispute.adminNote,
      resolvedBy: dispute.resolvedBy,
      resolvedAt: dispute.resolvedAt,
      createdAt: dispute.createdAt,
      updatedAt: dispute.updatedAt,
    };
  }
}
