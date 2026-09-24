import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { WalletsModule } from '../wallets/wallets.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { FlashSalesModule } from '../flash-sales/flash-sales.module';
import { SmmModule } from '../smm/smm.module';

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    VouchersModule,
    FlashSalesModule,
    SmmModule,
    forwardRef(() => WalletsModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
