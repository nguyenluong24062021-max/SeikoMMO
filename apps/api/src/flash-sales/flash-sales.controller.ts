import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { FlashSalesService } from './flash-sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateFlashSaleDto,
  UpdateFlashSaleDto,
  FlashSaleDto,
  ApiResponse,
  UserRole,
} from '@repo/shared';

@Controller('flash-sales')
export class FlashSalesController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async create(
    @Request() req: any,
    @Body() createFlashSaleDto: CreateFlashSaleDto,
  ): Promise<ApiResponse<FlashSaleDto>> {
    const flashSale = await this.flashSalesService.create(
      req.user.userId,
      req.user.role,
      createFlashSaleDto,
    );
    return {
      success: true,
      message: 'Flash sale created successfully',
      data: flashSale,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async findAll(
    @Query('productId') productId?: string,
  ): Promise<ApiResponse<FlashSaleDto[]>> {
    const flashSales = await this.flashSalesService.findAll(productId);
    return {
      success: true,
      data: flashSales,
    };
  }

  @Get('active')
  async findActive(): Promise<ApiResponse<FlashSaleDto[]>> {
    const flashSales = await this.flashSalesService.findActive();
    return {
      success: true,
      data: flashSales,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<FlashSaleDto>> {
    const flashSale = await this.flashSalesService.findOne(id);
    return {
      success: true,
      data: flashSale,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateFlashSaleDto: UpdateFlashSaleDto,
  ): Promise<ApiResponse<FlashSaleDto>> {
    const flashSale = await this.flashSalesService.update(
      id,
      req.user.userId,
      req.user.role,
      updateFlashSaleDto,
    );
    return {
      success: true,
      message: 'Flash sale updated successfully',
      data: flashSale,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponse<void>> {
    await this.flashSalesService.remove(id, req.user.userId, req.user.role);
    return {
      success: true,
      message: 'Flash sale deleted successfully',
    };
  }
}
