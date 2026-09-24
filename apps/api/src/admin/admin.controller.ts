import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  OrderDto,
  PayoutDto,
  UpdateOrderStatusDto,
  ApprovePayoutDto,
  AdminOrderQueryDto,
  AdminPayoutQueryDto,
  ApiResponse,
  OrderStatus,
  PayoutStatus,
} from '@repo/shared';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Get all orders with optional status filter
  @Get('orders')
  async getAllOrders(
    @Query('status') status?: OrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<{ orders: OrderDto[]; total: number; page: number; limit: number }>> {
    const queryDto: AdminOrderQueryDto = {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    const result = await this.adminService.getAllOrders(queryDto);
    return {
      success: true,
      data: result,
    };
  }

  // Get single order with full details
  @Get('orders/:id')
  async getOrder(@Param('id') id: string): Promise<ApiResponse<OrderDto>> {
    const order = await this.adminService.getOrder(id);
    return {
      success: true,
      data: order,
    };
  }

  // Update order status manually (for SEEDING orders)
  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ): Promise<ApiResponse<OrderDto>> {
    const order = await this.adminService.updateOrderStatus(id, updateDto.status);
    return {
      success: true,
      message: 'Order status updated successfully',
      data: order,
    };
  }

  // Get all payouts with optional status filter
  @Get('payouts')
  async getAllPayouts(
    @Query('status') status?: PayoutStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<{ payouts: PayoutDto[]; total: number; page: number; limit: number }>> {
    const queryDto: AdminPayoutQueryDto = {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    const result = await this.adminService.getAllPayouts(queryDto);
    return {
      success: true,
      data: result,
    };
  }

  // Get single payout with details
  @Get('payouts/:id')
  async getPayout(@Param('id') id: string): Promise<ApiResponse<PayoutDto>> {
    const payout = await this.adminService.getPayout(id);
    return {
      success: true,
      data: payout,
    };
  }

  // Approve or reject payout
  @Patch('payouts/:id/approve')
  async approvePayout(
    @Param('id') id: string,
    @Req() req: any,
    @Body() approveDto: ApprovePayoutDto,
  ): Promise<ApiResponse<PayoutDto>> {
    const adminId = req.user.userId;
    const payout = await this.adminService.approvePayout(id, adminId, approveDto);
    return {
      success: true,
      message: `Payout ${approveDto.status === PayoutStatus.COMPLETED ? 'approved' : 'rejected'} successfully`,
      data: payout,
    };
  }

  // Get statistics
  @Get('stats/overview')
  async getStats(): Promise<ApiResponse<any>> {
    const stats = await this.adminService.getStats();
    return {
      success: true,
      data: stats,
    };
  }
}
