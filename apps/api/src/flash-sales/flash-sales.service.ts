import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFlashSaleDto,
  UpdateFlashSaleDto,
  FlashSaleDto,
  UserRole,
} from '@repo/shared';

@Injectable()
export class FlashSalesService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    userRole: UserRole,
    createFlashSaleDto: CreateFlashSaleDto,
  ): Promise<FlashSaleDto> {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: createFlashSaleDto.productId },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check ownership (seller owns shop or admin)
    if (product.shop.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not own this product');
    }

    // Validate sale price is less than original price
    if (createFlashSaleDto.salePrice >= product.price) {
      throw new BadRequestException(
        'Flash sale price must be lower than original price',
      );
    }

    // Validate time range
    const startAt = new Date(createFlashSaleDto.startAt);
    const endAt = new Date(createFlashSaleDto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for overlapping flash sales on same product
    const overlapping = await this.prisma.flashSale.findFirst({
      where: {
        productId: createFlashSaleDto.productId,
        isActive: true,
        OR: [
          {
            AND: [
              { startAt: { lte: startAt } },
              { endAt: { gte: startAt } },
            ],
          },
          {
            AND: [
              { startAt: { lte: endAt } },
              { endAt: { gte: endAt } },
            ],
          },
          {
            AND: [
              { startAt: { gte: startAt } },
              { endAt: { lte: endAt } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        'Flash sale time overlaps with existing flash sale for this product',
      );
    }

    const flashSale = await this.prisma.flashSale.create({
      data: {
        productId: createFlashSaleDto.productId,
        salePrice: createFlashSaleDto.salePrice,
        stockCap: createFlashSaleDto.stockCap,
        startAt,
        endAt,
      },
      include: {
        product: true,
      },
    });

    return this.mapToFlashSaleDto(flashSale);
  }

  async findAll(productId?: string): Promise<FlashSaleDto[]> {
    const flashSales = await this.prisma.flashSale.findMany({
      where: productId ? { productId } : undefined,
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return flashSales.map((fs) => this.mapToFlashSaleDto(fs));
  }

  async findActive(): Promise<FlashSaleDto[]> {
    const now = new Date();
    const flashSales = await this.prisma.flashSale.findMany({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
        soldCount: { lt: this.prisma.flashSale.fields.stockCap },
      },
      include: {
        product: true,
      },
      orderBy: { endAt: 'asc' },
    });

    return flashSales.map((fs) => this.mapToFlashSaleDto(fs));
  }

  async findOne(id: string): Promise<FlashSaleDto> {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!flashSale) {
      throw new NotFoundException('Flash sale not found');
    }

    return this.mapToFlashSaleDto(flashSale);
  }

  async findActiveByProductId(productId: string): Promise<FlashSaleDto | null> {
    const now = new Date();
    const flashSale = await this.prisma.flashSale.findFirst({
      where: {
        productId,
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return flashSale ? this.mapToFlashSaleDto(flashSale) : null;
  }

  async update(
    id: string,
    userId: string,
    userRole: UserRole,
    updateFlashSaleDto: UpdateFlashSaleDto,
  ): Promise<FlashSaleDto> {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: {
        product: {
          include: { shop: true },
        },
      },
    });

    if (!flashSale) {
      throw new NotFoundException('Flash sale not found');
    }

    // Check ownership
    if (
      flashSale.product.shop.ownerId !== userId &&
      userRole !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this flash sale',
      );
    }

    // Validate sale price if provided
    if (
      updateFlashSaleDto.salePrice !== undefined &&
      updateFlashSaleDto.salePrice >= flashSale.product.price
    ) {
      throw new BadRequestException(
        'Flash sale price must be lower than original price',
      );
    }

    // Validate time range if provided
    if (updateFlashSaleDto.startAt || updateFlashSaleDto.endAt) {
      const startAt = updateFlashSaleDto.startAt
        ? new Date(updateFlashSaleDto.startAt)
        : flashSale.startAt;
      const endAt = updateFlashSaleDto.endAt
        ? new Date(updateFlashSaleDto.endAt)
        : flashSale.endAt;

      if (startAt >= endAt) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    const updated = await this.prisma.flashSale.update({
      where: { id },
      data: updateFlashSaleDto,
      include: {
        product: true,
      },
    });

    return this.mapToFlashSaleDto(updated);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: {
        product: {
          include: { shop: true },
        },
      },
    });

    if (!flashSale) {
      throw new NotFoundException('Flash sale not found');
    }

    // Check ownership
    if (
      flashSale.product.shop.ownerId !== userId &&
      userRole !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this flash sale',
      );
    }

    await this.prisma.flashSale.delete({
      where: { id },
    });
  }

  async incrementSoldCount(id: string, quantity: number): Promise<void> {
    await this.prisma.flashSale.update({
      where: { id },
      data: {
        soldCount: {
          increment: quantity,
        },
      },
    });
  }

  private mapToFlashSaleDto(flashSale: any): FlashSaleDto {
    return {
      id: flashSale.id,
      productId: flashSale.productId,
      productName: flashSale.product?.name,
      originalPrice: flashSale.product?.price,
      salePrice: flashSale.salePrice,
      stockCap: flashSale.stockCap,
      soldCount: flashSale.soldCount,
      startAt: flashSale.startAt,
      endAt: flashSale.endAt,
      isActive: flashSale.isActive,
      createdAt: flashSale.createdAt,
      updatedAt: flashSale.updatedAt,
    };
  }
}
