import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, retry } from 'rxjs';
import { ISmmProviderClient, SmmProviderException } from './smm-provider-client.interface';
import { ProviderOrderRequest, ProviderOrderResponse, ProviderStatusResponse, ProviderBalanceResponse } from '@repo/shared';
import { EncryptionService } from '../common/encryption.util';

/**
 * Real SMM Provider Client
 * Makes actual HTTP calls to external SMM provider APIs
 * Features:
 * - 10 second timeout per request
 * - 3 retries with exponential backoff
 * - Decrypts API key before use
 */
@Injectable()
export class RealSmmProviderClient implements ISmmProviderClient {
  private readonly logger = new Logger(RealSmmProviderClient.name);
  private readonly TIMEOUT_MS = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // Start with 1 second

  constructor(
    private readonly providerId: string,
    private readonly providerName: string,
    private readonly apiUrl: string,
    private readonly encryptedApiKey: string,
    private readonly httpService: HttpService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.logger.debug(`Client ready for provider ${this.providerId}`);
  }

  /**
   * Decrypt API key when needed
   */
  private getDecryptedApiKey(): string {
    try {
      return this.encryptionService.decrypt(this.encryptedApiKey);
    } catch (error) {
      this.logger.error(`Failed to decrypt API key for provider ${this.providerName}`, error);
      throw new SmmProviderException(
        'Failed to decrypt provider API key',
        'DECRYPTION_ERROR',
        500,
      );
    }
  }

  async placeOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse> {
    this.logger.debug(`[${this.providerName}] Placing order: ${JSON.stringify(request)}`);

    const apiKey = this.getDecryptedApiKey();

    try {
      const response$ = this.httpService.post(
        `${this.apiUrl}/order`,
        {
          key: apiKey,
          service: request.service,
          link: request.link,
          quantity: request.quantity,
        },
      ).pipe(
        timeout(this.TIMEOUT_MS),
        retry({
          count: this.MAX_RETRIES,
          delay: (_error, retryCount) => {
            const delay = this.RETRY_DELAY * Math.pow(2, retryCount - 1); // Exponential backoff
            this.logger.warn(
              `[${this.providerName}] Retry ${retryCount}/${this.MAX_RETRIES} after ${delay}ms for placeOrder`,
            );
            return new Promise(resolve => setTimeout(resolve, delay));
          },
        }),
      );

      const response = await firstValueFrom(response$);
      const data = response.data;

      // Validate response
      if (!data || !data.order) {
        throw new SmmProviderException(
          `Invalid response from provider: missing order ID`,
          'INVALID_RESPONSE',
          500,
        );
      }

      this.logger.log(`[${this.providerName}] Order placed: ${data.order}`);

      return {
        orderId: data.order.toString(),
        status: data.status || 'pending',
        charge: data.charge ? parseFloat(data.charge) : undefined,
      };
    } catch (error: any) {
      this.logger.error(
        `[${this.providerName}] Failed to place order: ${error.message}`,
        error.stack,
      );

      // Handle timeout
      if (error.name === 'TimeoutError') {
        throw new SmmProviderException(
          `Provider request timed out after ${this.TIMEOUT_MS}ms`,
          'TIMEOUT',
          408,
        );
      }

      // Handle HTTP errors
      if (error.response) {
        throw new SmmProviderException(
          `Provider API error: ${error.response.data?.error || error.response.statusText}`,
          'API_ERROR',
          error.response.status,
        );
      }

      // Handle network errors
      throw new SmmProviderException(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        503,
      );
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<ProviderStatusResponse> {
    this.logger.debug(`[${this.providerName}] Getting status for order: ${providerOrderId}`);

    const apiKey = this.getDecryptedApiKey();

    try {
      const response$ = this.httpService.post(
        `${this.apiUrl}/status`,
        {
          key: apiKey,
          order: providerOrderId,
        },
      ).pipe(
        timeout(this.TIMEOUT_MS),
        retry({
          count: this.MAX_RETRIES,
          delay: (_error, retryCount) => {
            const delay = this.RETRY_DELAY * Math.pow(2, retryCount - 1);
            this.logger.warn(
              `[${this.providerName}] Retry ${retryCount}/${this.MAX_RETRIES} after ${delay}ms for getOrderStatus`,
            );
            return new Promise(resolve => setTimeout(resolve, delay));
          },
        }),
      );

      const response = await firstValueFrom(response$);
      const data = response.data;

      // Validate response
      if (!data) {
        throw new SmmProviderException(
          `Invalid response from provider: no data`,
          'INVALID_RESPONSE',
          500,
        );
      }

      this.logger.log(
        `[${this.providerName}] Order ${providerOrderId} status: ${data.status}`,
      );

      return {
        orderId: providerOrderId,
        status: data.status || 'pending',
        startCount: data.start_count ? parseInt(data.start_count) : undefined,
        quantity: data.quantity ? parseInt(data.quantity) : undefined,
        remains: data.remains ? parseInt(data.remains) : undefined,
      };
    } catch (error: any) {
      this.logger.error(
        `[${this.providerName}] Failed to get order status: ${error.message}`,
        error.stack,
      );

      // Handle timeout
      if (error.name === 'TimeoutError') {
        throw new SmmProviderException(
          `Provider request timed out after ${this.TIMEOUT_MS}ms`,
          'TIMEOUT',
          408,
        );
      }

      // Handle HTTP errors
      if (error.response) {
        throw new SmmProviderException(
          `Provider API error: ${error.response.data?.error || error.response.statusText}`,
          'API_ERROR',
          error.response.status,
        );
      }

      // Handle network errors
      throw new SmmProviderException(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        503,
      );
    }
  }

  async getBalance(): Promise<ProviderBalanceResponse> {
    this.logger.debug(`[${this.providerName}] Getting balance`);

    const apiKey = this.getDecryptedApiKey();

    try {
      const response$ = this.httpService.post(
        `${this.apiUrl}/balance`,
        {
          key: apiKey,
        },
      ).pipe(
        timeout(this.TIMEOUT_MS),
        retry({
          count: this.MAX_RETRIES,
          delay: (_error, retryCount) => {
            const delay = this.RETRY_DELAY * Math.pow(2, retryCount - 1);
            this.logger.warn(
              `[${this.providerName}] Retry ${retryCount}/${this.MAX_RETRIES} after ${delay}ms for getBalance`,
            );
            return new Promise(resolve => setTimeout(resolve, delay));
          },
        }),
      );

      const response = await firstValueFrom(response$);
      const data = response.data;

      // Validate response
      if (!data || data.balance === undefined) {
        throw new SmmProviderException(
          `Invalid response from provider: missing balance`,
          'INVALID_RESPONSE',
          500,
        );
      }

      this.logger.log(`[${this.providerName}] Balance: ${data.balance}`);

      return {
        balance: parseFloat(data.balance),
        currency: data.currency || 'USD',
      };
    } catch (error: any) {
      this.logger.error(
        `[${this.providerName}] Failed to get balance: ${error.message}`,
        error.stack,
      );

      // Handle timeout
      if (error.name === 'TimeoutError') {
        throw new SmmProviderException(
          `Provider request timed out after ${this.TIMEOUT_MS}ms`,
          'TIMEOUT',
          408,
        );
      }

      // Handle HTTP errors
      if (error.response) {
        throw new SmmProviderException(
          `Provider API error: ${error.response.data?.error || error.response.statusText}`,
          'API_ERROR',
          error.response.status,
        );
      }

      // Handle network errors
      throw new SmmProviderException(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        503,
      );
    }
  }
}
