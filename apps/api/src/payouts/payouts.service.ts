import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePayoutDto,
  PayoutDto,
  PayoutStatus,
  TransactionType,
} from '@repo/shared';

@Injectable()
export class PayoutsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPayoutDto: CreatePayoutDto): Promise<PayoutDto> {
    const { amount, description } = createPayoutDto;

    if (amount < 50000) {
      throw new BadRequestException('Minimum payout amount is 50,000 VND');
    }

    // Get wallet
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          where: {
            type: {
              in: [TransactionType.PAYMENT, TransactionType.COMMISSION],
            },
            canWithdrawAt: { not: null },
          },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Check balance
    if (wallet.balance < amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${wallet.balance} VND, Requested: ${amount} VND`,
      );
    }

    // Check for funds on hold (within 24h)
    const now = new Date();
    const heldTransactions = wallet.transactions.filter(
      (tx) => tx.canWithdrawAt && tx.canWithdrawAt > now,
    );

    if (heldTransactions.length > 0) {
      const totalHeld = heldTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const availableBalance = wallet.balance - totalHeld;

      if (availableBalance < amount) {
        const nextAvailable = heldTransactions.reduce((earliest, tx) => {
          return !earliest || tx.canWithdrawAt! < earliest ? tx.canWithdrawAt! : earliest;
        }, null as Date | null);

        throw new BadRequestException(
          `Insufficient withdrawable balance. Total: ${wallet.balance} VND, On hold: ${totalHeld} VND, Available: ${availableBalance} VND. Funds will be available at ${nextAvailable?.toISOString()}`,
        );
      }
    }

    // Create payout in transaction
    const payout = await this.prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      // Create payout record
      const newPayout = await tx.payout.create({
        data: {
          walletId: wallet.id,
          amount,
          status: PayoutStatus.PENDING,
          description: description || 'Withdrawal request',
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount, // Negative for withdrawal
          type: TransactionType.PAYOUT,
          status: 'COMPLETED',
          description: `Payout: ${newPayout.id}`,
        },
      });

      return newPayout;
    });

    return this.mapToPayoutDto(payout);
  }

  async findAll(userId: string): Promise<PayoutDto[]> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        payouts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet.payouts.map((payout) => this.mapToPayoutDto(payout));
  }

  async findOne(id: string, userId: string): Promise<PayoutDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { id },
      include: { wallet: true },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    // Check ownership
    if (payout.wallet.userId !== userId) {
      throw new NotFoundException('Payout not found');
    }

    return this.mapToPayoutDto(payout);
  }

  private mapToPayoutDto(payout: any): PayoutDto {
    return {
      id: payout.id,
      walletId: payout.walletId,
      amount: payout.amount,
      status: payout.status,
      description: payout.description,
      resolvedBy: payout.resolvedBy,
      resolvedAt: payout.resolvedAt,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
    };
  }
}
