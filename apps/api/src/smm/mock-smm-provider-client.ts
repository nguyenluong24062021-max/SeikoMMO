import { Injectable, Logger } from '@nestjs/common';
import { ISmmProviderClient, SmmProviderException } from './smm-provider-client.interface';
import { ProviderOrderRequest, ProviderOrderResponse, ProviderStatusResponse, ProviderBalanceResponse } from '@repo/shared';

/**
 * Mock SMM Provider Client for testing
 * Simulates provider behavior: pending → processing → completed after 2 polls
 */
@Injectable()
export class MockSmmProviderClient implements ISmmProviderClient {
  private readonly logger = new Logger(MockSmmProviderClient.name);
  
  // In-memory storage for mock orders
  private static mockOrders = new Map<string, {
    orderId: string;
    serviceId: string;
    quantity: number;
    link?: string;
    status: 'pending' | 'processing' | 'completed' | 'partial' | 'cancelled' | 'failed';
    pollCount: number;
    startCount: number;
    currentCount: number;
    createdAt: Date;
  }>();

  // params kept for interface parity with RealSmmProviderClient (used in logs below via MOCK prefix)
  constructor(
    private readonly providerName: string,
    private readonly apiUrl: string,
  ) {
    this.logger.debug(`[MOCK] Client ready for ${this.providerName} (${this.apiUrl})`);
  }

  async placeOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse> {
    this.logger.debug(`[MOCK] Placing order: ${JSON.stringify(request)}`);

    // Simulate network delay
    await this.delay(100);

    // Generate mock order ID
    const orderId = `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store mock order
    MockSmmProviderClient.mockOrders.set(orderId, {
      orderId,
      serviceId: request.service,
      quantity: request.quantity,
      link: request.link,
      status: 'pending',
      pollCount: 0,
      startCount: 0,
      currentCount: 0,
      createdAt: new Date(),
    });

    this.logger.log(`[MOCK] Order placed: ${orderId}`);

    return {
      orderId,
      status: 'pending',
      charge: request.quantity * 0.01, // Mock charge: 0.01 per unit
    };
  }

  async getOrderStatus(providerOrderId: string): Promise<ProviderStatusResponse> {
    this.logger.debug(`[MOCK] Getting status for order: ${providerOrderId}`);

    // Simulate network delay
    await this.delay(50);

    const order = MockSmmProviderClient.mockOrders.get(providerOrderId);
    
    if (!order) {
      throw new SmmProviderException(
        `Order not found: ${providerOrderId}`,
        'ORDER_NOT_FOUND',
        404,
      );
    }

    // Increment poll count
    order.pollCount++;

    // Simulate status progression: pending → processing → completed
    if (order.pollCount === 1) {
      // First poll: still pending
      order.status = 'pending';
    } else if (order.pollCount === 2) {
      // Second poll: now processing, 30% done
      order.status = 'processing';
      order.startCount = 0;
      order.currentCount = Math.floor(order.quantity * 0.3);
    } else if (order.pollCount >= 3) {
      // Third+ poll: completed
      order.status = 'completed';
      order.currentCount = order.quantity;
    }

    const remains = order.quantity - order.currentCount;

    this.logger.log(
      `[MOCK] Order ${providerOrderId} status: ${order.status} (poll ${order.pollCount}, ${order.currentCount}/${order.quantity})`
    );

    return {
      orderId: providerOrderId,
      status: order.status,
      startCount: order.startCount,
      quantity: order.currentCount,
      remains,
    };
  }

  async getBalance(): Promise<ProviderBalanceResponse> {
    this.logger.debug('[MOCK] Getting balance');
    
    // Simulate network delay
    await this.delay(50);

    return {
      balance: 999999.99,
      currency: 'USD',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset mock orders (for testing)
   */
  static resetMockOrders(): void {
    MockSmmProviderClient.mockOrders.clear();
  }

  /**
   * Get all mock orders (for testing/debugging)
   */
  static getMockOrders(): Map<string, any> {
    return MockSmmProviderClient.mockOrders;
  }
}
