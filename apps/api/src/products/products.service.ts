import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShopsService } from '../shops/shops.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductDto,
  ImportStockDto,
  StockDto,
  UserRole,
  ProductType,
  StockStatus,
} from '@repo/shared';
import { parse } from 'csv-parse/sync';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private shopsService: ShopsService,
  ) {}

  async create(
    userId: string,
    userRole: UserRole,
    createProductDto: CreateProductDto,
  ): Promise<ProductDto> {
    // Verify shop ownership
    const shop = await this.shopsService.findOne(createProductDto.shopId);
    if (shop.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not own this shop');
    }

    const product = await this.prisma.product.create({
      data: createProductDto,
    });

    return {
      ...product,
      type: product.type as ProductType,
      availableStock: 0,
    };
  }

  async findAll(shopId?: string): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(shopId && { shopId }),
      },
      include: {
        _count: {
          select: {
            stocks: {
              where: { status: 'AVAILABLE' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type as ProductType,
      price: p.price,
      shopId: p.shopId,
      isActive: p.isActive,
      availableStock: p._count.stocks,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async findOne(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stocks: {
              where: { status: 'AVAILABLE' },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      type: product.type as ProductType,
      price: product.price,
      shopId: product.shopId,
      isActive: product.isActive,
      availableStock: product._count.stocks,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async update(
    id: string,
    userId: string,
    userRole: UserRole,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check ownership
    if (product.shop.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this product');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        _count: {
          select: {
            stocks: {
              where: { status: 'AVAILABLE' },
            },
          },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      type: updated.type as ProductType,
      price: updated.price,
      shopId: updated.shopId,
      isActive: updated.isActive,
      availableStock: updated._count.stocks,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check ownership
    if (product.shop.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this product');
    }

    await this.prisma.product.delete({
      where: { id },
    });
  }

  async importStock(
    userId: string,
    userRole: UserRole,
    importStockDto: ImportStockDto,
  ): Promise<{ imported: number; failed: number; duplicates: number }> {
    // Verify product ownership
    const product = await this.prisma.product.findUnique({
      where: { id: importStockDto.productId },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.shop.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not own this product');
    }

    let imported = 0;
    let failed = 0;
    let duplicates = 0;

    for (const key of importStockDto.keys) {
      const trimmedKey = key.trim();
      if (!trimmedKey) {
        failed++;
        continue;
      }

      try {
        // Check if key already exists
        const existing = await this.prisma.productStock.findUnique({
          where: { key: trimmedKey },
        });

        if (existing) {
          duplicates++;
          continue;
        }

        await this.prisma.productStock.create({
          data: {
            productId: importStockDto.productId,
            key: trimmedKey,
            status: 'AVAILABLE',
          },
        });
        imported++;
      } catch (error) {
        failed++;
      }
    }

    return { imported, failed, duplicates };
  }

  async parseStockFile(
    fileContent: string,
    fileType: 'txt' | 'csv',
  ): Promise<string[]> {
    if (fileType === 'txt') {
      // Parse line by line
      return fileContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } else {
      // Parse CSV
      try {
        const records = parse(fileContent, {
          columns: false,
          skip_empty_lines: true,
          trim: true,
        });
        // Flatten if multiple columns, take first column
        return records.map((record: any) => 
          Array.isArray(record) ? record[0] : record
        ).filter(Boolean);
      } catch (error) {
        throw new BadRequestException('Invalid CSV format');
      }
    }
  }

  async getStocks(productId: string): Promise<StockDto[]> {
    const stocks = await this.prisma.productStock.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
    return stocks.map((s) => ({ ...s, status: s.status as StockStatus }));
  }
}
