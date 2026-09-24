import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AffiliateStatsDto, TransactionType } from '@repo/shared';

@Injectable()
export class AffiliateService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string): Promise<AffiliateStatsDto> {
    // Get user with referral code (generate lazily for accounts created before referral system)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referralCode: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = await this.generateAndAssignReferralCode(userId);
    }

    // Find all users referred by this user
    const referredUsers = await this.prisma.user.findMany({
      where: {
        referredBy: referralCode,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        hasReceivedReferral: true,
        orders: {
          select: {
            id: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1, // Only first order matters
        },
      },
    });

    // Get all commission transactions for this referrer
    const commissionTransactions = await this.prisma.transaction.findMany({
      where: {
        walletId: (
          await this.prisma.wallet.findUnique({
            where: { userId },
            select: { id: true },
          })
        )?.id,
        type: TransactionType.COMMISSION,
        description: {
          contains: 'Referral commission',
        },
      },
      select: {
        amount: true,
        orderId: true,
        createdAt: true,
      },
    });

    // Calculate total commission
    const totalCommission = commissionTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );

    // Build referredUsers details
    const referredUsersDetails = referredUsers.map((refUser) => {
      const firstOrder = refUser.orders[0];
      const commissionTx = commissionTransactions.find(
        (tx) => tx.orderId === firstOrder?.id,
      );

      return {
        email: refUser.email,
        name: refUser.name,
        joinedAt: refUser.createdAt,
        hasOrdered: !!firstOrder,
        commissionEarned: commissionTx?.amount || 0,
      };
    });

    return {
      referralCode,
      totalReferrals: referredUsers.length,
      totalCommission,
      referredUsers: referredUsersDetails,
    };
  }

  /**
   * Generate a unique referral code and assign it to a user.
   * Used for accounts created before the referral system existed.
   */
  private async generateAndAssignReferralCode(userId: string): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let attempts = 0; attempts < 10; attempts++) {
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      });
      if (!existing) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { referralCode: code },
        });
        return code;
      }
    }
    throw new NotFoundException('Could not generate referral code, please retry');
  }
}
