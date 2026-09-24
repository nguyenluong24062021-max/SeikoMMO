import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiResponse,
  WalletWithHistoryDto,
  CreateDepositDto,
  DepositResponseDto,
  TransactionDto,
} from '@repo/shared';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  async getMyWallet(
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse<WalletWithHistoryDto>> {
    const data = await this.walletsService.findWithHistory(user.sub);
    return {
      success: true,
      data,
      message: 'Wallet retrieved successfully',
    };
  }

  @Post('deposit')
  async createDeposit(
    @CurrentUser() user: { sub: string },
    @Body() createDepositDto: CreateDepositDto,
  ): Promise<ApiResponse<DepositResponseDto>> {
    const data = await this.walletsService.createDeposit(user.sub, createDepositDto);
    return {
      success: true,
      data,
      message: 'Deposit request created. Scan QR code to complete payment.',
    };
  }

  @Post('deposit/confirm')
  async confirmDeposit(
    @CurrentUser() user: { sub: string },
    @Body() body: { transactionId: string; amount: number },
  ): Promise<ApiResponse<TransactionDto>> {
    const data = await this.walletsService.processDeposit(
      user.sub,
      body.transactionId,
      body.amount,
    );
    return {
      success: true,
      data,
      message: 'Deposit confirmed successfully',
    };
  }
}
