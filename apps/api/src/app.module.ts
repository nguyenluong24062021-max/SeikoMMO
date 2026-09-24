import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ShopsModule } from './shops/shops.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { WalletsModule } from './wallets/wallets.module';
import { PayoutsModule } from './payouts/payouts.module';
import { ReviewsModule } from './reviews/reviews.module';
import { DisputesModule } from './disputes/disputes.module';
import { AdminModule } from './admin/admin.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { FlashSalesModule } from './flash-sales/flash-sales.module';
import { TasksModule } from './tasks/tasks.module';
import { AffiliateModule } from './affiliate/affiliate.module';
import { SmmModule } from './smm/smm.module';
import { CryptoModule } from './crypto/crypto.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Schedule module for cron jobs
    ScheduleModule.forRoot(),
    // Throttler module for rate limiting (10 requests per minute)
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 10, // 10 requests per TTL
    }]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ShopsModule,
    ProductsModule,
    OrdersModule,
    WalletsModule,
    PayoutsModule,
    ReviewsModule,
    DisputesModule,
    AdminModule,
    WebhooksModule,
    VouchersModule,
    FlashSalesModule,
    TasksModule,
    AffiliateModule,
    SmmModule,
    CryptoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
