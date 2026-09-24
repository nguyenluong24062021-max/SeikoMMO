import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
  ICryptoGateway,
  CreateInvoiceRequest,
  CreateInvoiceResponse,
} from './crypto-gateway.interface';

/**
 * NowPayments Gateway Implementation
 * 
 * Production crypto payment gateway using NowPayments API
 * - Supports USDT (TRC20, ERC20, BEP20), BTC, ETH
 * - 10 second timeout with 3 retries
 * - HMAC-SHA256 webhook signature verification
 * - Automatic VND to USD conversion
 * 
 * Environment Variables Required:
 * - NOWPAYMENTS_API_KEY: API key from NowPayments
 * - NOWPAYMENTS_IPN_SECRET: IPN secret for webhook verification
 * - CRYPTO_VND_RATE: VND to USD exchange rate (default: 26000)
 */
@Injectable()
export class NowPaymentsGateway implements ICryptoGateway {
  private readonly logger = new Logger(NowPaymentsGateway.name);
  private readonly apiUrl = 'https://api.nowpayments.io/v1';
  private readonly apiKey: string;
  private readonly ipnSecret: string;
  private readonly vndRate: number;
  private readonly timeout = 10000; // 10 seconds
  private readonly maxRetries = 3;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('NOWPAYMENTS_API_KEY') || '';
    this.ipnSecret = this.configService.get<string>('NOWPAYMENTS_IPN_SECRET') || '';
    this.vndRate = parseInt(
      this.configService.get<string>('CRYPTO_VND_RATE') || '26000',
      10,
    );

    if (!this.apiKey) {
      this.logger.error('NOWPAYMENTS_API_KEY not configured');
    }
    if (!this.ipnSecret) {
      this.logger.error('NOWPAYMENTS_IPN_SECRET not configured');
    }
    if (this.vndRate === 26000) {
      this.logger.warn(
        'Using default CRYPTO_VND_RATE (26000). Consider setting actual exchange rate in env.',
      );
    }
  }

  async createInvoice(
    request: CreateInvoiceRequest,
  ): Promise<CreateInvoiceResponse> {
    const { amountVND, coin } = request;

    // Convert VND to USD
    const amountUSD = amountVND / this.vndRate;
    
    // Map our coin enum to NowPayments currency codes
    const payCurrency = this.mapCoinToCurrency(coin);

    this.logger.log(
      `Creating NowPayments invoice: ${amountVND} VND (${amountUSD.toFixed(2)} USD) in ${payCurrency}`,
    );

    try {
      // Create payment with retry logic
      const payment = await this.retryRequest(async () => {
        const response = await firstValueFrom(
          this.httpService.post(
            `${this.apiUrl}/payment`,
            {
              price_amount: amountUSD.toFixed(2),
              price_currency: 'usd',
              pay_currency: payCurrency,
              ipn_callback_url: `${this.configService.get('API_BASE_URL')}/webhooks/nowpayments`,
              order_id: `TX_${Date.now()}`, // Will be replaced by actual transaction ID
              order_description: `Crypto deposit ${amountVND} VND`,
            },
            {
              headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
              },
              timeout: this.timeout,
            },
          ),
        );

        return response.data;
      });

      const invoiceId = payment.payment_id.toString();
      const payAddress = payment.pay_address;
      const payAmount = payment.pay_amount.toString();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      this.logger.log(
        `✅ NowPayments invoice created: ${invoiceId} - Send ${payAmount} ${payCurrency} to ${payAddress}`,
      );

      return {
        invoiceId,
        payAddress,
        payAmount,
        payCurrency,
        expiresAt,
        invoiceUrl: payment.invoice_url || undefined,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create NowPayments invoice: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Crypto payment provider error: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    if (!this.ipnSecret) {
      this.logger.error('Cannot verify webhook: NOWPAYMENTS_IPN_SECRET not configured');
      return false;
    }

    if (!signature) {
      this.logger.error('Webhook signature missing');
      return false;
    }

    try {
      // NowPayments uses HMAC-SHA256
      const hmac = crypto.createHmac('sha256', this.ipnSecret);
      hmac.update(rawBody);
      const calculatedSignature = hmac.digest('hex');

      const isValid = calculatedSignature === signature;

      if (!isValid) {
        this.logger.error(
          `Webhook signature mismatch. Expected: ${calculatedSignature}, Got: ${signature}`,
        );
      } else {
        this.logger.debug('Webhook signature verified successfully');
      }

      return isValid;
    } catch (error: any) {
      this.logger.error(`Webhook verification error: ${error.message}`);
      return false;
    }
  }

  /**
   * Map our internal coin enum to NowPayments currency codes
   */
  private mapCoinToCurrency(coin: string): string {
    const mapping: Record<string, string> = {
      USDT_TRC20: 'usdttrc20',
      USDT_ERC20: 'usdterc20',
      USDT_BEP20: 'usdtbep20',
      BTC: 'btc',
      ETH: 'eth',
    };

    const currency = mapping[coin];
    if (!currency) {
      throw new Error(`Unsupported cryptocurrency: ${coin}`);
    }

    return currency;
  }

  /**
   * Retry logic for HTTP requests
   * Retries up to maxRetries times with exponential backoff
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt >= this.maxRetries) {
        throw error;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s delay
      this.logger.warn(
        `Request failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retryRequest(fn, attempt + 1);
    }
  }
}
