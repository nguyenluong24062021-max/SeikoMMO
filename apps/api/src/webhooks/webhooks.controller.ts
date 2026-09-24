import { Controller, Post, Body } from '@nestjs/common';
import { WalletsService } from '../wallets/wallets.service';
import { SePayWebhookDto, ApiResponse, TransactionDto } from '@repo/shared';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post('sepay')
  async handleSePayWebhook(
    @Body() webhookDto: SePayWebhookDto,
  ): Promise<ApiResponse<TransactionDto>> {
    const transaction = await this.walletsService.processSePayWebhook(webhookDto);
    return {
      success: true,
      data: transaction,
      message: 'Webhook processed successfully',
    };
  }
}
