import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { CryptoController } from './crypto.controller';
import { MockCryptoGateway } from './mock-crypto-gateway';
import { NowPaymentsGateway } from './nowpayments-gateway';

/**
 * Crypto Payment Module
 * 
 * Provides cryptocurrency payment functionality:
 * - Mock gateway for development (mock://)
 * - NowPayments gateway for production
 * - Deposit creation and webhook handling
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    ConfigModule,
  ],
  controllers: [CryptoController],
  providers: [
    PrismaService,
    CryptoService,
    MockCryptoGateway,
    NowPaymentsGateway,
  ],
  exports: [CryptoService],
})
export class CryptoModule {}
