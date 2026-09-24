import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServiceMappingDto,
  UpdateServiceMappingDto,
  ServiceMappingDto,
} from '@repo/shared';

@Injectable()
export class ServiceMappingService {
  private readonly logger = new Logger(ServiceMappingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create new service mapping
   * Validates that product and provider exist
   */
  async create(createDto: CreateServiceMappingDto): Promise<ServiceMappingDto> {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: createDto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product not found: ${createDto.productId}`);
    }

    // Check if provider exists
    const provider = await this.prisma.smmProvider.findUnique({
      where: { id: createDto.providerId },
    });

    if (!provider) {
      throw new NotFoundException(`Provider not found: ${createDto.providerId}`);
    }

    // Check if mapping already exists (unique constraint)
    const existing = await this.prisma.serviceMapping.findUnique({
      where: {
        productId_providerId: {
          productId: createDto.productId,
          providerId: createDto.providerId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Mapping already exists for product ${createDto.productId} and provider ${createDto.providerId}`
      );
    }

    // Create mapping
    const mapping = await this.prisma.serviceMapping.create({
      data: {
        productId: createDto.productId,
        providerId: createDto.providerId,
        providerServiceId: createDto.providerServiceId,
        ratePerThousand: createDto.ratePerThousand,
      },
      include: {
        product: true,
        provider: true,
      },
    });

    this.logger.log(
      `Created mapping: ${product.name} → ${provider.name} (service ${createDto.providerServiceId})`
    );

    return this.mapToDto(mapping);
  }

  /**
   * Get all mappings
   * Optionally filter by productId or providerId
   */
  async findAll(productId?: string, providerId?: string): Promise<ServiceMappingDto[]> {
    const where: any = {};
    
    if (productId) {
      where.productId = productId;
    }
    
    if (providerId) {
      where.providerId = providerId;
    }

    const mappings = await this.prisma.serviceMapping.findMany({
      where,
      include: {
        product: true,
        provider: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return mappings.map(m => this.mapToDto(m));
  }

  /**
   * Get mappings for a specific product
   */
  async findByProductId(productId: string): Promise<ServiceMappingDto[]> {
    return this.findAll(productId);
  }

  /**
   * Get one mapping by ID
   */
  async findOne(id: string): Promise<ServiceMappingDto> {
    const mapping = await this.prisma.serviceMapping.findUnique({
      where: { id },
      include: {
        product: true,
        provider: true,
      },
    });

    if (!mapping) {
      throw new NotFoundException(`Mapping not found: ${id}`);
    }

    return this.mapToDto(mapping);
  }

  /**
   * Update mapping
   */
  async update(id: string, updateDto: UpdateServiceMappingDto): Promise<ServiceMappingDto> {
    const mapping = await this.prisma.serviceMapping.findUnique({
      where: { id },
    });

    if (!mapping) {
      throw new NotFoundException(`Mapping not found: ${id}`);
    }

    const updated = await this.prisma.serviceMapping.update({
      where: { id },
      data: {
        providerServiceId: updateDto.providerServiceId,
        ratePerThousand: updateDto.ratePerThousand,
        isActive: updateDto.isActive,
      },
      include: {
        product: true,
        provider: true,
      },
    });

    this.logger.log(`Updated mapping: ${id}`);

    return this.mapToDto(updated);
  }

  /**
   * Delete mapping
   */
  async remove(id: string): Promise<void> {
    const mapping = await this.prisma.serviceMapping.findUnique({
      where: { id },
    });

    if (!mapping) {
      throw new NotFoundException(`Mapping not found: ${id}`);
    }

    await this.prisma.serviceMapping.delete({
      where: { id },
    });

    this.logger.log(`Deleted mapping: ${id}`);
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToDto(mapping: any): ServiceMappingDto {
    return {
      id: mapping.id,
      productId: mapping.productId,
      providerId: mapping.providerId,
      providerServiceId: mapping.providerServiceId,
      ratePerThousand: mapping.ratePerThousand,
      isActive: mapping.isActive,
      productName: mapping.product?.name,
      providerName: mapping.provider?.name,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
    };
  }
}
