import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ISmmProviderClient } from './smm-provider-client.interface';
import { MockSmmProviderClient } from './mock-smm-provider-client';
import { RealSmmProviderClient } from './real-smm-provider-client';
import { EncryptionService } from '../common/encryption.util';

/**
 * Factory to create appropriate SMM Provider client
 * - Mock client if apiUrl starts with "mock://"
 * - Real HTTP client otherwise
 */
@Injectable()
export class ProviderClientFactory {
  private readonly logger = new Logger(ProviderClientFactory.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Create a provider client based on provider configuration
   * @param provider Provider data from database
   * @returns Appropriate client implementation
   */
  create(provider: {
    id: string;
    name: string;
    apiUrl: string;
    apiKeyEncrypted: string;
  }): ISmmProviderClient {
    // Check if this is a mock provider
    if (provider.apiUrl.toLowerCase().startsWith('mock://')) {
      this.logger.debug(`Creating Mock client for provider: ${provider.name}`);
      return new MockSmmProviderClient(provider.name, provider.apiUrl);
    }

    // Create real HTTP client
    this.logger.debug(`Creating Real HTTP client for provider: ${provider.name}`);
    return new RealSmmProviderClient(
      provider.id,
      provider.name,
      provider.apiUrl,
      provider.apiKeyEncrypted,
      this.httpService,
      this.encryptionService,
    );
  }
}
