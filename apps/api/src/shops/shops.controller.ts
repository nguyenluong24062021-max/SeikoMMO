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
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateShopDto,
  UpdateShopDto,
  ApiResponse,
  ShopDto,
  UserRole,
} from '@repo/shared';

@Controller('shops')
export class ShopsController {
  constructor(private shopsService: ShopsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async create(
    @CurrentUser() user: { sub: string },
    @Body() createShopDto: CreateShopDto,
  ): Promise<ApiResponse<ShopDto>> {
    const shop = await this.shopsService.create(user.sub, createShopDto);
    return {
      success: true,
      data: shop,
      message: 'Shop created successfully',
    };
  }

  @Get()
  async findAll(): Promise<ApiResponse<ShopDto[]>> {
    const shops = await this.shopsService.findAll();
    return {
      success: true,
      data: shops,
    };
  }

  @Get('my-shops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async findMyShops(
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse<ShopDto[]>> {
    const shops = await this.shopsService.findByOwner(user.sub);
    return {
      success: true,
      data: shops,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<ShopDto>> {
    const shop = await this.shopsService.findOne(id);
    return {
      success: true,
      data: shop,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: UserRole },
    @Body() updateShopDto: UpdateShopDto,
  ): Promise<ApiResponse<ShopDto>> {
    const shop = await this.shopsService.update(
      id,
      user.sub,
      user.role,
      updateShopDto,
    );
    return {
      success: true,
      data: shop,
      message: 'Shop updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: UserRole },
  ): Promise<ApiResponse<void>> {
    await this.shopsService.remove(id, user.sub, user.role);
    return {
      success: true,
      message: 'Shop deleted successfully',
    };
  }
}
