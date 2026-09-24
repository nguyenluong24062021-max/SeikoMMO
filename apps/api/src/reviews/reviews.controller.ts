import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateReviewDto,
  ReviewDto,
  ApiResponse,
} from '@repo/shared';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER')
  async create(
    @Req() req: any,
    @Body() createReviewDto: CreateReviewDto,
  ): Promise<ApiResponse<ReviewDto>> {
    const userId = req.user.userId;
    const review = await this.reviewsService.create(userId, createReviewDto);
    return {
      success: true,
      message: 'Review created successfully',
      data: review,
    };
  }

  @Get('product/:productId')
  async findByProduct(
    @Param('productId') productId: string,
  ): Promise<ApiResponse<ReviewDto[]>> {
    const reviews = await this.reviewsService.findByProduct(productId);
    return {
      success: true,
      data: reviews,
    };
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  async findMyReviews(@Req() req: any): Promise<ApiResponse<ReviewDto[]>> {
    const userId = req.user.userId;
    const reviews = await this.reviewsService.findByUser(userId);
    return {
      success: true,
      data: reviews,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<ReviewDto>> {
    const review = await this.reviewsService.findOne(id);
    return {
      success: true,
      data: review,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateReviewDto: Partial<CreateReviewDto>,
  ): Promise<ApiResponse<ReviewDto>> {
    const userId = req.user.userId;
    const review = await this.reviewsService.update(id, userId, updateReviewDto);
    return {
      success: true,
      message: 'Review updated successfully',
      data: review,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req: any): Promise<ApiResponse> {
    const userId = req.user.userId;
    const userRole = req.user.role;
    await this.reviewsService.remove(id, userId, userRole);
    return {
      success: true,
      message: 'Review deleted successfully',
    };
  }
}
