import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherDto,
  VoucherType,
} from '@repo/shared';

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    userRole: string,
    createVoucherDto: CreateVoucherDto,
  ): Promise<VoucherDto> {
    const { code, type, value, maxUses, expiresAt, shopId } = createVoucherDto;

    // Check if code already exists
    const existing = await this.prisma.voucher.findUnique({
      where: { code },
    });

    if (existing) {
      throw new BadRequestException('Voucher code already exists');
    }

    // If shopId is provided, verify user owns the shop (unless admin)
    if (shopId && userRole !== 'ADMIN') {
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
      });

      if (!shop || shop.ownerId !== userId) {
        throw new ForbiddenException('You do not own this shop');
      }
    }

    // Validate value
    if (type === VoucherType.PERCENTAGE && (value < 1 || value > 100)) {
      throw new BadRequestException('Percentage must be between 1 and 100');
    }

    if (type === VoucherType.FIXED_AMOUNT && value < 1000) {
      throw new BadRequestException('Fixed amount must be at least 1000 VND');
    }

    const voucher = await this.prisma.voucher.create({
      data: {
        code,
        type,
        value,
        maxUses: maxUses || 1,
        expiresAt,
        shopId,
      },
    });

    return this.mapToVoucherDto(voucher);
  }

  async findAll(userId?: string, userRole?: string): Promise<VoucherDto[]> {
    // Admin can see all vouchers
    if (userRole === 'ADMIN') {
      const vouchers = await this.prisma.voucher.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return vouchers.map((v) => this.mapToVoucherDto(v));
    }

    // Seller can see their shop vouchers
    if (userId && userRole === 'SELLER') {
      const shops = await this.prisma.shop.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });

      const shopIds = shops.map((s) => s.id);

      const vouchers = await this.prisma.voucher.findMany({
        where: {
          OR: [
            { shopId: { in: shopIds } },
            { shopId: null }, // Platform-wide vouchers
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      return vouchers.map((v) => this.mapToVoucherDto(v));
    }

    // Buyers can only see active, non-expired, available vouchers
    const now = new Date();
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return vouchers.map((v) => this.mapToVoucherDto(v));
  }

  async findOne(code: string): Promise<VoucherDto> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    return this.mapToVoucherDto(voucher);
  }

  async update(
    code: string,
    userId: string,
    userRole: string,
    updateVoucherDto: UpdateVoucherDto,
  ): Promise<VoucherDto> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code },
      include: { shop: true },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    // Check ownership (admin can edit all, seller only their shop's vouchers)
    if (userRole !== 'ADMIN') {
      if (voucher.shopId) {
        const shop = await this.prisma.shop.findUnique({
          where: { id: voucher.shopId },
        });

        if (!shop || shop.ownerId !== userId) {
          throw new ForbiddenException('You do not own this voucher');
        }
      } else {
        throw new ForbiddenException('Only admins can edit platform-wide vouchers');
      }
    }

    // Validate new value if provided
    if (updateVoucherDto.value !== undefined) {
      const type = updateVoucherDto.type || voucher.type;
      if (type === VoucherType.PERCENTAGE && (updateVoucherDto.value < 1 || updateVoucherDto.value > 100)) {
        throw new BadRequestException('Percentage must be between 1 and 100');
      }
      if (type === VoucherType.FIXED_AMOUNT && updateVoucherDto.value < 1000) {
        throw new BadRequestException('Fixed amount must be at least 1000 VND');
      }
    }

    const updated = await this.prisma.voucher.update({
      where: { code },
      data: updateVoucherDto,
    });

    return this.mapToVoucherDto(updated);
  }

  async remove(code: string, userId: string, userRole: string): Promise<void> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    // Check ownership
    if (userRole !== 'ADMIN') {
      if (voucher.shopId) {
        const shop = await this.prisma.shop.findUnique({
          where: { id: voucher.shopId },
        });

        if (!shop || shop.ownerId !== userId) {
          throw new ForbiddenException('You do not own this voucher');
        }
      } else {
        throw new ForbiddenException('Only admins can delete platform-wide vouchers');
      }
    }

    await this.prisma.voucher.delete({
      where: { code },
    });
  }

  // Internal method to validate and use a voucher
  async validateAndUse(code: string, shopId?: string): Promise<{
    valid: boolean;
    discountAmount?: number;
    voucher?: VoucherDto;
    error?: string;
  }> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code },
    });

    if (!voucher) {
      return { valid: false, error: 'Voucher not found' };
    }

    if (!voucher.isActive) {
      return { valid: false, error: 'Voucher is not active' };
    }

    if (voucher.usedCount >= voucher.maxUses) {
      return { valid: false, error: 'Voucher usage limit reached' };
    }

    if (voucher.expiresAt && new Date() > voucher.expiresAt) {
      return { valid: false, error: 'Voucher has expired' };
    }

    // Check if voucher applies to this shop
    if (voucher.shopId && voucher.shopId !== shopId) {
      return { valid: false, error: 'Voucher does not apply to this shop' };
    }

    return {
      valid: true,
      voucher: this.mapToVoucherDto(voucher),
    };
  }

  async incrementUsage(code: string): Promise<void> {
    await this.prisma.voucher.update({
      where: { code },
      data: { usedCount: { increment: 1 } },
    });
  }

  private mapToVoucherDto(voucher: any): VoucherDto {
    return {
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      maxUses: voucher.maxUses,
      usedCount: voucher.usedCount,
      expiresAt: voucher.expiresAt,
      shopId: voucher.shopId,
      isActive: voucher.isActive,
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
    };
  }
}
