import { ProviderOrderRequest, ProviderOrderResponse, ProviderStatusResponse, ProviderBalanceResponse } from '@repo/shared';

/**
 * Interface for SMM Provider clients
 * Implementations: MockSmmProviderClient, RealSmmProviderClient
 */
export interface ISmmProviderClient {
  /**
   * Place an order with the provider
   * @param request Order details (service ID, quantity, link)
   * @returns Provider's order ID and initial status
   * @throws SmmProviderException on network/API errors
   */
  placeOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse>;

  /**
   * Get order status from provider
   * @param providerOrderId Provider's order ID
   * @returns Current status, progress, and remaining count
   * @throws SmmProviderException on network/API errors
   */
  getOrderStatus(providerOrderId: string): Promise<ProviderStatusResponse>;

  /**
   * Get provider balance (optional - for test connection)
   * @returns Current balance in provider's currency
   * @throws SmmProviderException on network/API errors
   */
  getBalance?(): Promise<ProviderBalanceResponse>;
}

/**
 * Custom exception for SMM Provider errors
 */
export class SmmProviderException extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'SmmProviderException';
  }
}
