import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ICryptoGateway } from './crypto-gateway.interface';
import { MockCryptoGateway } from './mock-crypto-gateway';
import { NowPaymentsGateway } from './nowpayments-gateway';
import {
  CreateCryptoDepositDto,
  CryptoInvoiceDto,
  CryptoCurrency,
  TransactionType,
} from '@repo/shared';

/**
 * Crypto Payment Service
 * 
 * Handles cryptocurrency deposit operations:
 * - Creates crypto invoices via gateway (Mock or NowPayments)
 * - Manages pending transactions
 * - Gateway selection based on CRYPTO_GATEWAY_URL env variable
 *   - mock://dev → MockCryptoGateway (auto-completes after 60s)
 *   - https://... → NowPaymentsGateway (production)
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly gateway: ICryptoGateway;
  private readonly vndRate: number;
  private readonly minDeposit = 50000; // 50k VND
  private readonly maxDeposit = 500000000; // 500M VND

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mockGateway: MockCryptoGateway,
    private readonly nowPaymentsGateway: NowPaymentsGateway,
  ) {
    // Select gateway based on configuration
    const gatewayUrl = this.configService.get<string>('CRYPTO_GATEWAY_URL') || 'mock://dev';
    
    if (gatewayUrl.startsWith('mock://')) {
      this.gateway = this.mockGateway;
      this.logger.log('🧪 Using MockCryptoGateway for development');
    } else {
      this.gateway = this.nowPaymentsGateway;
      this.logger.log('💰 Using NowPaymentsGateway for production');
    }

    this.vndRate = parseInt(
      this.configService.get<string>('CRYPTO_VND_RATE') || '26000',
      10,
    );

    if (this.vndRate === 26000) {
      this.logger.warn(
        '⚠️  Using static VND/USD rate (26000). Update CRYPTO_VND_RATE env variable for accurate conversion.',
      );
    }
  }

  /**
   * Create a crypto deposit invoice
   * 
   * @param userId User creating the deposit
   * @param dto Deposit parameters (amount in VND, cryptocurrency)
   * @returns Invoice details with payment address and crypto amount
   */
  async createCryptoDeposit(
    userId: string,
    dto: CreateCryptoDepositDto,
  ): Promise<CryptoInvoiceDto> {
    const { amountVND, coin } = dto;

    // Validate amount
    if (amountVND < this.minDeposit) {
      throw new BadRequestException(
        `Minimum crypto deposit is ${this.minDeposit.toLocaleString()} VND`,
      );
    }

    if (amountVND > this.maxDeposit) {
      throw new BadRequestException(
        `Maximum crypto deposit is ${this.maxDeposit.toLocaleString()} VND`,
      );
    }

    // Validate cryptocurrency
    if (!Object.values(CryptoCurrency).includes(coin as CryptoCurrency)) {
      throw new BadRequestException(
        `Unsupported cryptocurrency: ${coin}. Supported: ${Object.values(CryptoCurrency).join(', ')}`,
      );
    }

    this.logger.log(
      `Creating crypto deposit for user ${userId}: ${amountVND} VND in ${coin}`,
    );

    // Find or create wallet
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    // Create invoice via gateway
    const invoice = await this.gateway.createInvoice({
      amountVND,
      coin,
    });

    // Create PENDING transaction to track this deposit
    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        userId,
        amount: amountVND,
        type: TransactionType.DEPOSIT,
        status: 'PENDING',
        provider: 'NOWPAYMENTS', // Even mock uses NOWPAYMENTS format
        providerTxId: invoice.invoiceId,
        description: `Pending crypto deposit: ${invoice.payAmount} ${invoice.payCurrency}`,
      },
    });

    this.logger.log(
      `✅ Crypto invoice created: ${invoice.invoiceId} - Awaiting payment of ${invoice.payAmount} ${invoice.payCurrency}`,
    );

    return {
      invoiceId: invoice.invoiceId,
      payAddress: invoice.payAddress,
      payAmount: invoice.payAmount,
      payCurrency: invoice.payCurrency,
      expiresAt: invoice.expiresAt,
      invoiceUrl: invoice.invoiceUrl,
      amountVND,
    };
  }

  /**
   * Process NowPayments webhook
   * 
   * @param rawBody Raw request body (for signature verification)
   * @param signature HMAC signature from x-nowpayments-sig header
   * @param payload Parsed webhook payload
   */
  async processWebhook(
    rawBody: string,
    signature: string,
    payload: any,
  ): Promise<void> {
    const { payment_id, payment_status, order_id } = payload;

    this.logger.log(
      `Processing NowPayments webhook: payment_id=${payment_id}, status=${payment_status}, order_id=${order_id}`,
    );

    // Verify webhook signature
    const isValid = this.gateway.verifyWebhook(rawBody, signature);
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Find transaction by providerTxId
    const transaction = await this.prisma.transaction.findUnique({
      where: { providerTxId: payment_id.toString() },
    });

    if (!transaction) {
      this.logger.error(`Transaction not found for payment_id: ${payment_id}`);
      throw new BadRequestException('Transaction not found');
    }

    // Check if already completed (idempotency)
    if (transaction.status === 'COMPLETED') {
      this.logger.log(`Transaction ${transaction.id} already completed - idempotent replay`);
      return;
    }

    // Handle different payment statuses
    switch (payment_status) {
      case 'finished':
      case 'confirmed':
        // Payment successful - add balance
        await this.completeDeposit(transaction);
        break;

      case 'partially_paid':
        // Partial payment - keep pending and log
        this.logger.warn(
          `Payment ${payment_id} partially paid - keeping PENDING status`,
        );
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            description: `Partial payment: ${payload.actually_paid} ${payload.pay_currency}`,
          },
        });
        break;

      case 'failed':
      case 'expired':
      case 'refunded':
        // Payment failed - mark as FAILED
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            description: `Crypto payment ${payment_status}: ${payload.pay_currency}`,
          },
        });
        this.logger.log(`Transaction ${transaction.id} marked as FAILED (${payment_status})`);
        break;

      default:
        // Waiting/confirming - keep pending
        this.logger.debug(
          `Payment ${payment_id} status: ${payment_status} - keeping PENDING`,
        );
    }
  }

  /**
   * Complete a crypto deposit by adding balance and marking transaction as COMPLETED
   */
  private async completeDeposit(transaction: any): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Add balance to wallet
      await tx.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: { increment: transaction.amount } },
      });

      // Mark transaction as COMPLETED
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          description: `Crypto deposit completed: ${transaction.amount} VND`,
        },
      });
    });

    this.logger.log(
      `✅ Crypto deposit completed: ${transaction.id} - Added ${transaction.amount} VND to wallet`,
    );
  }

  /**
   * Get gateway instance (for testing/debugging)
   */
  getGateway(): ICryptoGateway {
    return this.gateway;
  }
}
