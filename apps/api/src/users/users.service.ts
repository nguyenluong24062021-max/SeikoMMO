import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, UserDto, UserRole } from '@repo/shared';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a unique referral code (8 characters: uppercase + numbers)
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async create(data: RegisterDto & { password: string }) {
    // Generate unique referral code
    let referralCode = this.generateReferralCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await this.prisma.user.findUnique({
        where: { referralCode },
      });
      if (!existing) break;
      referralCode = this.generateReferralCode();
      attempts++;
    }

    // Validate referredBy code if provided
    let referredByCode: string | undefined;
    if (data.referredBy) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: data.referredBy },
      });
      if (!referrer) {
        throw new BadRequestException('Invalid referral code');
      }
      referredByCode = data.referredBy;
    }

    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role || 'BUYER',
        referralCode,
        referredBy: referredByCode,
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Partial<{ refreshToken: string | null }>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async getProfile(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        referralCode: true,
        referredBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { ...user, role: user.role as UserRole };
  }
}
