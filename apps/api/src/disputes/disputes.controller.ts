import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateDisputeDto,
  UpdateDisputeDto,
  DisputeDto,
  ApiResponse,
  DisputeStatus,
} from '@repo/shared';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  // Buyer creates a dispute
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER')
  async create(
    @Req() req: any,
    @Body() createDisputeDto: CreateDisputeDto,
  ): Promise<ApiResponse<DisputeDto>> {
    const userId = req.user.userId;
    const dispute = await this.disputesService.create(userId, createDisputeDto);
    return {
      success: true,
      message: 'Dispute created successfully',
      data: dispute,
    };
  }

  // Get all disputes (buyer sees own, admin sees all)
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Req() req: any,
    @Query('status') status?: DisputeStatus,
  ): Promise<ApiResponse<DisputeDto[]>> {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const disputes = await this.disputesService.findAll(userId, userRole, status);
    return {
      success: true,
      data: disputes,
    };
  }

  // Get single dispute
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ApiResponse<DisputeDto>> {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const dispute = await this.disputesService.findOne(id, userId, userRole);
    return {
      success: true,
      data: dispute,
    };
  }

  // Admin resolves dispute (REFUND or REJECT)
  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async resolve(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateDisputeDto: UpdateDisputeDto,
  ): Promise<ApiResponse<DisputeDto>> {
    const adminId = req.user.userId;
    const dispute = await this.disputesService.resolve(
      id,
      adminId,
      updateDisputeDto,
    );
    return {
      success: true,
      message: 'Dispute resolved successfully',
      data: dispute,
    };
  }
}
