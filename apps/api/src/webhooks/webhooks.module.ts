import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [WalletsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
