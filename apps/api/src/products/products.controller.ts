import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateProductDto,
  UpdateProductDto,
  ImportStockDto,
  ApiResponse,
  ProductDto,
  StockDto,
  UserRole,
} from '@repo/shared';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async create(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Body() createProductDto: CreateProductDto,
  ): Promise<ApiResponse<ProductDto>> {
    const product = await this.productsService.create(
      user.sub,
      user.role,
      createProductDto,
    );
    return {
      success: true,
      data: product,
      message: 'Product created successfully',
    };
  }

  @Get()
  async findAll(
    @Query('shopId') shopId?: string,
  ): Promise<ApiResponse<ProductDto[]>> {
    const products = await this.productsService.findAll(shopId);
    return {
      success: true,
      data: products,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<ProductDto>> {
    const product = await this.productsService.findOne(id);
    return {
      success: true,
      data: product,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: UserRole },
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ApiResponse<ProductDto>> {
    const product = await this.productsService.update(
      id,
      user.sub,
      user.role,
      updateProductDto,
    );
    return {
      success: true,
      data: product,
      message: 'Product updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: UserRole },
  ): Promise<ApiResponse<void>> {
    await this.productsService.remove(id, user.sub, user.role);
    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }

  @Post('stock/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async importStock(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Body() importStockDto: ImportStockDto,
  ): Promise<ApiResponse<{ imported: number; failed: number; duplicates: number }>> {
    const result = await this.productsService.importStock(
      user.sub,
      user.role,
      importStockDto,
    );
    return {
      success: true,
      data: result,
      message: `Imported ${result.imported} keys successfully`,
    };
  }

  @Post('stock/import-file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async importStockFile(
    @CurrentUser() user: { sub: string; role: UserRole },
    @UploadedFile() file: Express.Multer.File,
    @Body('productId') productId: string,
  ): Promise<ApiResponse<{ imported: number; failed: number; duplicates: number }>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }

    // Determine file type
    const fileType = file.originalname.endsWith('.csv') ? 'csv' : 'txt';
    const fileContent = file.buffer.toString('utf-8');

    // Parse file
    const keys = await this.productsService.parseStockFile(fileContent, fileType);

    // Import
    const result = await this.productsService.importStock(
      user.sub,
      user.role,
      { productId, keys },
    );

    return {
      success: true,
      data: result,
      message: `Imported ${result.imported} keys from file`,
    };
  }

  @Get(':id/stocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async getStocks(@Param('id') id: string): Promise<ApiResponse<StockDto[]>> {
    const stocks = await this.productsService.getStocks(id);
    return {
      success: true,
      data: stocks,
    };
  }
}
