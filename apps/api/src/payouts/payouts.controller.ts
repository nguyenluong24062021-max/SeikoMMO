import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiResponse,
  CreatePayoutDto,
  PayoutDto,
  UserRole,
} from '@repo/shared';

@Controller('payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN)
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post()
  async create(
    @CurrentUser() user: { sub: string },
    @Body() createPayoutDto: CreatePayoutDto,
  ): Promise<ApiResponse<PayoutDto>> {
    const data = await this.payoutsService.create(user.sub, createPayoutDto);
    return {
      success: true,
      data,
      message: 'Payout request created successfully',
    };
  }

  @Get()
  async findAll(
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse<PayoutDto[]>> {
    const data = await this.payoutsService.findAll(user.sub);
    return {
      success: true,
      data,
      message: 'Payouts retrieved successfully',
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse<PayoutDto>> {
    const data = await this.payoutsService.findOne(id, user.sub);
    return {
      success: true,
      data,
      message: 'Payout retrieved successfully',
    };
  }
}
