import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  ApiResponse,
  VoucherDto,
  UserRole,
} from '@repo/shared';

@Controller('vouchers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async create(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Body() createVoucherDto: CreateVoucherDto,
  ): Promise<ApiResponse<VoucherDto>> {
    const voucher = await this.vouchersService.create(
      user.sub,
      user.role,
      createVoucherDto,
    );
    return {
      success: true,
      data: voucher,
      message: 'Voucher created successfully',
    };
  }

  @Get()
  async findAll(
    @CurrentUser() user: { sub: string; role: UserRole },
  ): Promise<ApiResponse<VoucherDto[]>> {
    const vouchers = await this.vouchersService.findAll(user.sub, user.role);
    return {
      success: true,
      data: vouchers,
    };
  }

  @Get(':code')
  async findOne(@Param('code') code: string): Promise<ApiResponse<VoucherDto>> {
    const voucher = await this.vouchersService.findOne(code);
    return {
      success: true,
      data: voucher,
    };
  }

  @Patch(':code')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async update(
    @Param('code') code: string,
    @CurrentUser() user: { sub: string; role: UserRole },
    @Body() updateVoucherDto: UpdateVoucherDto,
  ): Promise<ApiResponse<VoucherDto>> {
    const voucher = await this.vouchersService.update(
      code,
      user.sub,
      user.role,
      updateVoucherDto,
    );
    return {
      success: true,
      data: voucher,
      message: 'Voucher updated successfully',
    };
  }

  @Delete(':code')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async remove(
    @Param('code') code: string,
    @CurrentUser() user: { sub: string; role: UserRole },
  ): Promise<ApiResponse<null>> {
    await this.vouchersService.remove(code, user.sub, user.role);
    return {
      success: true,
      data: null,
      message: 'Voucher deleted successfully',
    };
  }
}
