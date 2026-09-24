import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AffiliateService } from './affiliate.service';
import { ApiResponse, AffiliateStatsDto } from '@repo/shared';

@Controller('affiliate')
@UseGuards(JwtAuthGuard)
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Get('stats')
  async getStats(@Request() req: any): Promise<ApiResponse<AffiliateStatsDto>> {
    const stats = await this.affiliateService.getStats(req.user.userId);
    return {
      success: true,
      message: 'Affiliate stats retrieved successfully',
      data: stats,
    };
  }
}
