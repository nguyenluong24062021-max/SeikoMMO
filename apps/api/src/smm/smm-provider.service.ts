import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.util';
import { ProviderClientFactory } from './provider-client.factory';
import {
  CreateSmmProviderDto,
  UpdateSmmProviderDto,
  SmmProviderDto,
  ProviderStatus,
  TestProviderConnectionResponse,
} from '@repo/shared';

@Injectable()
export class SmmProviderService {
  private readonly logger = new Logger(SmmProviderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly providerClientFactory: ProviderClientFactory,
  ) {}

  /**
   * Create new SMM provider
   * Encrypts API key before storing
   */
  async create(createDto: CreateSmmProviderDto): Promise<SmmProviderDto> {
    // Validate apiUrl format
    const apiUrl = createDto.apiUrl.trim();
    const isValidUrl = /^https?:\/\/.+/.test(apiUrl) || /^mock:\/\/.+/.test(apiUrl);
    
    if (!isValidUrl) {
      throw new BadRequestException(
        'Invalid apiUrl format. Must start with http://, https://, or mock://'
      );
    }

    // Check if provider name already exists
    const existing = await this.prisma.smmProvider.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new BadRequestException(`Provider with name "${createDto.name}" already exists`);
    }

    // Encrypt API key
    const apiKeyEncrypted = this.encryptionService.encrypt(createDto.apiKey);

    // Create provider
    const provider = await this.prisma.smmProvider.create({
      data: {
        name: createDto.name,
        apiUrl: createDto.apiUrl,
        apiKeyEncrypted,
        balanceEndpoint: createDto.balanceEndpoint,
      },
    });

    this.logger.log(`Created provider: ${provider.name} (${provider.id})`);

    return this.mapToDto(provider, createDto.apiKey);
  }

  /**
   * Get all providers
   * Masks API keys in response
   */
  async findAll(): Promise<SmmProviderDto[]> {
    const providers = await this.prisma.smmProvider.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return providers.map(p => {
      // Decrypt to mask (never return encrypted key directly)
      const decrypted = this.encryptionService.decrypt(p.apiKeyEncrypted);
      return this.mapToDto(p, decrypted);
    });
  }

  /**
   * Get one provider by ID
   * Masks API key in response
   */
  async findOne(id: string): Promise<SmmProviderDto> {
    const provider = await this.prisma.smmProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    const decrypted = this.encryptionService.decrypt(provider.apiKeyEncrypted);
    return this.mapToDto(provider, decrypted);
  }

  /**
   * Update provider
   * Re-encrypts API key if changed
   */
  async update(id: string, updateDto: UpdateSmmProviderDto): Promise<SmmProviderDto> {
    const provider = await this.prisma.smmProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    // Check name uniqueness if changing
    if (updateDto.name && updateDto.name !== provider.name) {
      const existing = await this.prisma.smmProvider.findUnique({
        where: { name: updateDto.name },
      });

      if (existing) {
        throw new BadRequestException(`Provider with name "${updateDto.name}" already exists`);
      }
    }

    // Prepare update data
    const data: any = {
      name: updateDto.name,
      apiUrl: updateDto.apiUrl,
      balanceEndpoint: updateDto.balanceEndpoint,
      status: updateDto.status,
    };

    // Re-encrypt API key if provided
    let decryptedKey = this.encryptionService.decrypt(provider.apiKeyEncrypted);
    if (updateDto.apiKey) {
      data.apiKeyEncrypted = this.encryptionService.encrypt(updateDto.apiKey);
      decryptedKey = updateDto.apiKey;
    }

    // Update provider
    const updated = await this.prisma.smmProvider.update({
      where: { id },
      data,
    });

    this.logger.log(`Updated provider: ${updated.name} (${updated.id})`);

    return this.mapToDto(updated, decryptedKey);
  }

  /**
   * Delete provider
   * Cascades to service mappings via FK constraint
   */
  async remove(id: string): Promise<void> {
    const provider = await this.prisma.smmProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    await this.prisma.smmProvider.delete({
      where: { id },
    });

    this.logger.log(`Deleted provider: ${provider.name} (${provider.id})`);
  }

  /**
   * Test connection to provider
   * Calls getBalance() to verify API key and connectivity
   */
  async testConnection(id: string): Promise<TestProviderConnectionResponse> {
    const provider = await this.prisma.smmProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    try {
      // Create client
      const client = this.providerClientFactory.create(provider);

      // Test connection by getting balance
      if (!client.getBalance) {
        return {
          success: true,
          message: 'Provider client created successfully (balance check not supported)',
        };
      }

      const balanceResponse = await client.getBalance();

      this.logger.log(
        `Test connection successful for ${provider.name}: balance ${balanceResponse.balance} ${balanceResponse.currency}`
      );

      return {
        success: true,
        message: `Connected successfully. Balance: ${balanceResponse.balance} ${balanceResponse.currency}`,
        balance: balanceResponse.balance,
      };
    } catch (error: any) {
      this.logger.error(`Test connection failed for ${provider.name}: ${error.message}`);

      return {
        success: false,
        message: 'Connection failed',
        error: error.message,
      };
    }
  }

  /**
   * Map Prisma model to DTO
   * Masks API key (show only last 4 characters)
   */
  private mapToDto(provider: any, decryptedApiKey: string): SmmProviderDto {
    // Mask API key: show only last 4 chars
    const maskedKey = decryptedApiKey.length > 4
      ? '****' + decryptedApiKey.slice(-4)
      : '****';

    return {
      id: provider.id,
      name: provider.name,
      apiUrl: provider.apiUrl,
      apiKey: maskedKey,
      balanceEndpoint: provider.balanceEndpoint,
      status: provider.status as ProviderStatus,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }
}
