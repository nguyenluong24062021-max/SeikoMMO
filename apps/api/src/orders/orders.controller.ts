import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateOrderDto,
  ApiResponse,
  OrderDto,
  UserRole,
} from '@repo/shared';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async create(
    @CurrentUser() user: { sub: string },
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<ApiResponse<OrderDto>> {
    const order = await this.ordersService.create(user.sub, createOrderDto);
    return {
      success: true,
      data: order,
      message: 'Order created successfully',
    };
  }

  @Get()
  async findAll(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Query('all') all?: string,
  ): Promise<ApiResponse<OrderDto[]>> {
    // Admin can see all orders with ?all=true
    const showAll = user.role === UserRole.ADMIN && all === 'true';
    const orders = await this.ordersService.findAll(
      showAll ? undefined : user.sub,
    );
    return {
      success: true,
      data: orders,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: UserRole },
  ): Promise<ApiResponse<OrderDto>> {
    const order = await this.ordersService.findOne(id, user.sub, user.role);
    return {
      success: true,
      data: order,
    };
  }

  @Patch(':id/progress')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async updateProgress(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() updateProgressDto: any, // UpdateOrderProgressDto from @repo/shared
  ): Promise<ApiResponse<OrderDto>> {
    const order = await this.ordersService.updateProgress(
      id,
      user.sub,
      updateProgressDto,
    );
    return {
      success: true,
      data: order,
      message: 'Order progress updated successfully',
    };
  }
}
