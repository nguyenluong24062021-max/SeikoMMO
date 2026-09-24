import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReviewDto,
  ReviewDto,
} from '@repo/shared';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<ReviewDto> {
    const { productId, rating, comment } = createReviewDto;

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user has purchased this product
    const hasPurchased = await this.prisma.order.findFirst({
      where: {
        buyerId: userId,
        status: { in: ['DELIVERED', 'COMPLETED'] },
        items: {
          some: {
            productId,
          },
        },
      },
    });

    if (!hasPurchased) {
      throw new ForbiddenException(
        'You can only review products you have purchased and received',
      );
    }

    // Check if user already reviewed this product
    const existingReview = await this.prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        productId,
        userId,
        rating,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.mapToReviewDto(review);
  }

  async findByProduct(productId: string): Promise<ReviewDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reviews.map(this.mapToReviewDto);
  }

  async findByUser(userId: string): Promise<ReviewDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reviews.map(this.mapToReviewDto);
  }

  async findOne(id: string): Promise<ReviewDto> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.mapToReviewDto(review);
  }

  async update(
    id: string,
    userId: string,
    updateData: Partial<CreateReviewDto>,
  ): Promise<ReviewDto> {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    // Validate rating if provided
    if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        ...(updateData.rating && { rating: updateData.rating }),
        ...(updateData.comment !== undefined && { comment: updateData.comment }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.mapToReviewDto(updatedReview);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only the review owner or admin can delete
    if (review.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id },
    });
  }

  private mapToReviewDto(review: any): ReviewDto {
    return {
      id: review.id,
      productId: review.productId,
      userId: review.userId,
      userName: review.user?.name || 'Unknown User',
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
