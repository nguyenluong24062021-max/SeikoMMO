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
  Query,
} from '@nestjs/common';
import { ServiceMappingService } from './service-mapping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiResponse,
  CreateServiceMappingDto,
  UpdateServiceMappingDto,
  ServiceMappingDto,
  UserRole,
} from '@repo/shared';

@Controller('smm/mappings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ServiceMappingController {
  constructor(private readonly serviceMappingService: ServiceMappingService) {}

  @Post()
  async create(
    @Body() createDto: CreateServiceMappingDto,
  ): Promise<ApiResponse<ServiceMappingDto>> {
    const data = await this.serviceMappingService.create(createDto);
    return {
      success: true,
      message: 'Mapping created successfully',
      data,
    };
  }

  @Get()
  async findAll(
    @Query('productId') productId?: string,
    @Query('providerId') providerId?: string,
  ): Promise<ApiResponse<ServiceMappingDto[]>> {
    const data = await this.serviceMappingService.findAll(productId, providerId);
    return {
      success: true,
      message: 'Mappings retrieved successfully',
      data,
    };
  }

  @Get('product/:productId')
  async findByProduct(
    @Param('productId') productId: string,
  ): Promise<ApiResponse<ServiceMappingDto[]>> {
    const data = await this.serviceMappingService.findByProductId(productId);
    return {
      success: true,
      message: 'Mappings retrieved successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<ServiceMappingDto>> {
    const data = await this.serviceMappingService.findOne(id);
    return {
      success: true,
      message: 'Mapping retrieved successfully',
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceMappingDto,
  ): Promise<ApiResponse<ServiceMappingDto>> {
    const data = await this.serviceMappingService.update(id, updateDto);
    return {
      success: true,
      message: 'Mapping updated successfully',
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.serviceMappingService.remove(id);
  }
}
