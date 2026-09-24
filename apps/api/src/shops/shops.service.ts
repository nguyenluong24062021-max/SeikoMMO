import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateShopDto,
  UpdateShopDto,
  ShopDto,
  UserRole,
} from '@repo/shared';

@Injectable()
export class ShopsService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, createShopDto: CreateShopDto): Promise<ShopDto> {
    const shop = await this.prisma.shop.create({
      data: {
        ...createShopDto,
        ownerId,
      },
    });

    return shop;
  }

  async findAll(): Promise<ShopDto[]> {
    return this.prisma.shop.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOwner(ownerId: string): Promise<ShopDto[]> {
    return this.prisma.shop.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<ShopDto> {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }

  async update(
    id: string,
    userId: string,
    userRole: UserRole,
    updateShopDto: UpdateShopDto,
  ): Promise<ShopDto> {
    const shop = await this.findOne(id);

    // Check ownership or admin
    if (shop.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this shop');
    }

    const updated = await this.prisma.shop.update({
      where: { id },
      data: updateShopDto,
    });

    return updated;
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const shop = await this.findOne(id);

    // Check ownership or admin
    if (shop.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this shop');
    }

    await this.prisma.shop.delete({
      where: { id },
    });
  }
}
