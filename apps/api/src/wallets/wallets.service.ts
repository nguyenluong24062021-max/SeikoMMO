import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  WalletDto,
  WalletWithHistoryDto,
  TransactionDto,
  CreateDepositDto,
  DepositResponseDto,
  SePayWebhookDto,
  TransactionType,
} from '@repo/shared';
import * as crypto from 'crypto';

@Injectable()
export class WalletsService {
  private readonly sePaySecret: string;
  private readonly sePayMerchant: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.sePaySecret = this.configService.get<string>('SEPAY_SECRET') || 'default-secret-key';
    this.sePayMerchant = this.configService.get<string>('SEPAY_MERCHANT') || 'SEIKO_MMO';
  }

  async findByUserId(userId: string): Promise<WalletDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.mapToWalletDto(wallet);
  }

  async findWithHistory(userId: string): Promise<WalletWithHistoryDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50, // Last 50 transactions
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      wallet: this.mapToWalletDto(wallet),
      transactions: wallet.transactions.map((tx) => this.mapToTransactionDto(tx)),
    };
  }

  async createDeposit(
    userId: string,
    createDepositDto: CreateDepositDto,
  ): Promise<DepositResponseDto> {
    const { amount } = createDepositDto;

    if (amount < 10000) {
      throw new BadRequestException('Minimum deposit amount is 10,000 VND');
    }

    if (amount > 50000000) {
      throw new BadRequestException('Maximum deposit amount is 50,000,000 VND');
    }

    // Find or create wallet
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    // Generate mock SePay transaction ID
    const transactionId = `SEPAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create PENDING transaction record to track this deposit
    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        userId,
        amount,
        type: TransactionType.DEPOSIT,
        status: 'PENDING',
        description: `Pending deposit via SePay`,
        sePayTransId: transactionId,
      },
    });

    // Generate mock QR code (in real implementation, this would call SePay API)
    const qrCode = this.generateMockQRCode(transactionId, amount);

    // Set expiration (15 minutes)
    const expireAt = new Date(Date.now() + 15 * 60 * 1000);

    return {
      qrCode,
      transactionId,
      amount,
      expireAt,
    };
  }

  async processSePayWebhook(webhookDto: SePayWebhookDto): Promise<TransactionDto> {
    const { transactionId, amount, status, signature } = webhookDto;

    // Verify signature (required unless explicitly allowed for local testing)
    const allowUnsigned =
      this.configService.get<string>('SEPAY_ALLOW_UNSIGNED') === 'true';
    if (!signature && !allowUnsigned) {
      throw new ForbiddenException('Missing signature');
    }
    if (signature) {
      const isValid = this.verifySePaySignature(transactionId, amount, signature);
      if (!isValid) {
        throw new ForbiddenException('Invalid signature');
      }
    }

    if (status !== 'SUCCESS') {
      // Update PENDING transaction to FAILED
      const pendingTx = await this.prisma.transaction.findUnique({
        where: { sePayTransId: transactionId },
      });

      if (pendingTx && pendingTx.status === 'PENDING') {
        const failedTx = await this.prisma.transaction.update({
          where: { id: pendingTx.id },
          data: { status: 'FAILED', description: 'Payment failed' },
        });
        return this.mapToTransactionDto(failedTx);
      }

      throw new BadRequestException('Payment failed');
    }

    // Check if transaction already completed (idempotency)
    const existingTx = await this.prisma.transaction.findUnique({
      where: { sePayTransId: transactionId },
    });

    if (existingTx && existingTx.status === 'COMPLETED') {
      return this.mapToTransactionDto(existingTx);
    }

    if (!existingTx) {
      throw new BadRequestException('Transaction not found. Please create deposit first.');
    }

    // Get userId from pending transaction
    const userId = existingTx.userId;
    if (!userId) {
      throw new BadRequestException('Transaction missing userId');
    }

    // Process the deposit
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Update wallet balance
      await tx.wallet.update({
        where: { id: existingTx.walletId },
        data: { balance: { increment: amount } },
      });

      // Update transaction to COMPLETED
      const completedTx = await tx.transaction.update({
        where: { id: existingTx.id },
        data: {
          status: 'COMPLETED',
          description: `Deposit completed via SePay: ${transactionId}`,
        },
      });

      return completedTx;
    });

    return this.mapToTransactionDto(transaction);
  }

  private verifySePaySignature(transactionId: string, amount: number, signature: string): boolean {
    // Generate expected signature: HMAC-SHA256(transactionId|amount|merchant, secret)
    const payload = `${transactionId}|${amount}|${this.sePayMerchant}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.sePaySecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  async processDeposit(
    userId: string,
    transactionId: string,
    amount: number,
  ): Promise<TransactionDto> {
    // Check if transaction already processed
    const existingTx = await this.prisma.transaction.findUnique({
      where: { sePayTransId: transactionId },
    });

    if (existingTx) {
      throw new BadRequestException('Transaction already processed');
    }

    // Find or create wallet
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    // Create transaction and update balance
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Update wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });

      // Create transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: TransactionType.DEPOSIT,
          description: `Deposit via SePay: ${transactionId}`,
          sePayTransId: transactionId,
        },
      });

      return newTransaction;
    });

    return this.mapToTransactionDto(transaction);
  }

  async deductBalance(
    userId: string,
    amount: number,
    orderId: string,
    description: string,
  ): Promise<TransactionDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.balance < amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${wallet.balance} VND, Required: ${amount} VND`,
      );
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      // Create transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          orderId,
          amount: -amount, // Negative for deduction
          type: TransactionType.PAYMENT,
          description,
        },
      });

      return newTransaction;
    });

    return this.mapToTransactionDto(transaction);
  }

  async addBalance(
    userId: string,
    amount: number,
    type: TransactionType,
    description: string,
    orderId?: string,
    holdFor24h = false,
  ): Promise<TransactionDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const canWithdrawAt = holdFor24h ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const transaction = await this.prisma.$transaction(async (tx) => {
      // Add to wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });

      // Create transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          orderId,
          amount,
          type,
          description,
          canWithdrawAt,
        },
      });

      return newTransaction;
    });

    return this.mapToTransactionDto(transaction);
  }

  private generateMockQRCode(transactionId: string, amount: number): string {
    // Mock QR code - in real implementation, would call SePay API
    // Returns base64 encoded data URL
    const qrData = `sepay://pay?tid=${transactionId}&amount=${amount}`;
    return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="10" y="100" font-size="12">SePay QR Mock</text><text x="10" y="120" font-size="10">${qrData}</text></svg>`).toString('base64')}`;
  }

  private mapToWalletDto(wallet: any): WalletDto {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  private mapToTransactionDto(transaction: any): TransactionDto {
    return {
      id: transaction.id,
      walletId: transaction.walletId,
      userId: transaction.userId,
      orderId: transaction.orderId,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      description: transaction.description,
      sePayTransId: transaction.sePayTransId,
      canWithdrawAt: transaction.canWithdrawAt,
      createdAt: transaction.createdAt,
    };
  }
}
