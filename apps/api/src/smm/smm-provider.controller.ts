import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SmmProviderService } from './smm-provider.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiResponse,
  CreateSmmProviderDto,
  UpdateSmmProviderDto,
  SmmProviderDto,
  TestProviderConnectionResponse,
  UserRole,
} from '@repo/shared';

@Controller('smm/providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SmmProviderController {
  constructor(private readonly smmProviderService: SmmProviderService) {}

  @Post()
  async create(
    @Body() createDto: CreateSmmProviderDto,
  ): Promise<ApiResponse<SmmProviderDto>> {
    const data = await this.smmProviderService.create(createDto);
    return {
      success: true,
      message: 'Provider created successfully',
      data,
    };
  }

  @Get()
  async findAll(): Promise<ApiResponse<SmmProviderDto[]>> {
    const data = await this.smmProviderService.findAll();
    return {
      success: true,
      message: 'Providers retrieved successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<SmmProviderDto>> {
    const data = await this.smmProviderService.findOne(id);
    return {
      success: true,
      message: 'Provider retrieved successfully',
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSmmProviderDto,
  ): Promise<ApiResponse<SmmProviderDto>> {
    const data = await this.smmProviderService.update(id, updateDto);
    return {
      success: true,
      message: 'Provider updated successfully',
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.smmProviderService.remove(id);
  }

  @Post(':id/test')
  async testConnection(
    @Param('id') id: string,
  ): Promise<ApiResponse<TestProviderConnectionResponse>> {
    const data = await this.smmProviderService.testConnection(id);
    return {
      success: data.success,
      message: data.message,
      data,
    };
  }
}
