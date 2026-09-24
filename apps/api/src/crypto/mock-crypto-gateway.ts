import { Injectable, Logger } from '@nestjs/common';
import {
  ICryptoGateway,
  CreateInvoiceRequest,
  CreateInvoiceResponse,
} from './crypto-gateway.interface';

/**
 * Mock Crypto Gateway for Development/Testing
 * 
 * - URL: mock://dev
 * - Creates fake invoices that auto-complete after 60 seconds
 * - No signature verification (always returns true)
 * - Useful for local testing without real crypto API keys
 */
@Injectable()
export class MockCryptoGateway implements ICryptoGateway {
  private readonly logger = new Logger(MockCryptoGateway.name);
  private pendingInvoices = new Map<string, NodeJS.Timeout>();

  async createInvoice(
    request: CreateInvoiceRequest,
  ): Promise<CreateInvoiceResponse> {
    const { amountVND, coin } = request;

    // Generate mock invoice ID
    const invoiceId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Mock crypto address (different format per coin)
    let payAddress: string;
    let payCurrency: string;

    switch (coin) {
      case 'USDT_TRC20':
        payAddress = 'TMockAddressForTRC20Testing123456789';
        payCurrency = 'usdttrc20';
        break;
      case 'USDT_ERC20':
        payAddress = '0xMockAddressForERC20Testing123456789abcdef';
        payCurrency = 'usdterc20';
        break;
      case 'USDT_BEP20':
        payAddress = '0xMockAddressForBEP20Testing123456789abcdef';
        payCurrency = 'usdtbep20';
        break;
      case 'BTC':
        payAddress = 'bc1qMockBitcoinAddressForTesting123456';
        payCurrency = 'btc';
        break;
      case 'ETH':
        payAddress = '0xMockEthereumAddressForTesting123456789abc';
        payCurrency = 'eth';
        break;
      default:
        payAddress = 'MockAddressUnknownCoin';
        payCurrency = coin.toLowerCase();
    }

    // Mock exchange rate (simplified)
    const vndToUsd = 26000; // 1 USD = 26,000 VND
    const amountUSD = amountVND / vndToUsd;
    
    // Mock crypto amounts (prices as of mock time)
    let payAmount: string;
    switch (coin) {
      case 'USDT_TRC20':
      case 'USDT_ERC20':
      case 'USDT_BEP20':
        payAmount = amountUSD.toFixed(2); // USDT = ~1 USD
        break;
      case 'BTC':
        payAmount = (amountUSD / 50000).toFixed(8); // BTC = ~50k USD
        break;
      case 'ETH':
        payAmount = (amountUSD / 3000).toFixed(6); // ETH = ~3k USD
        break;
      default:
        payAmount = amountUSD.toFixed(6);
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    this.logger.log(
      `Mock invoice created: ${invoiceId} for ${amountVND} VND (${payAmount} ${payCurrency})`,
    );
    this.logger.warn(
      `⏳ This mock invoice will auto-complete in 60 seconds for testing`,
    );

    // Schedule auto-completion after 60 seconds (for testing webhook flow)
    const timeout = setTimeout(() => {
      this.logger.log(
        `✅ Mock invoice ${invoiceId} auto-completed after 60s timeout`,
      );
      this.pendingInvoices.delete(invoiceId);
    }, 60000);

    this.pendingInvoices.set(invoiceId, timeout);

    return {
      invoiceId,
      payAddress,
      payAmount,
      payCurrency,
      expiresAt,
      invoiceUrl: `mock://invoice/${invoiceId}`,
    };
  }

  verifyWebhook(_rawBody: string, _signature: string): boolean {
    // Mock gateway always accepts webhooks (no verification)
    this.logger.debug(`Mock webhook verification: always returns true`);
    return true;
  }

  /**
   * Cleanup method to cancel pending timers
   * Call this when shutting down the service
   */
  cleanup() {
    this.logger.log(`Cleaning up ${this.pendingInvoices.size} pending mock invoices`);
    for (const timeout of this.pendingInvoices.values()) {
      clearTimeout(timeout);
    }
    this.pendingInvoices.clear();
  }
}
