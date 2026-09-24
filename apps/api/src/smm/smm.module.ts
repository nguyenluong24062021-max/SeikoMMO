import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionService } from '../common/encryption.util';
import { ProviderClientFactory } from './provider-client.factory';
import { SmmProviderService } from './smm-provider.service';
import { SmmProviderController } from './smm-provider.controller';
import { ServiceMappingService } from './service-mapping.service';
import { ServiceMappingController } from './service-mapping.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 seconds
      maxRedirects: 3,
    }),
    PrismaModule,
  ],
  providers: [
    EncryptionService,
    ProviderClientFactory,
    SmmProviderService,
    ServiceMappingService,
  ],
  controllers: [
    SmmProviderController,
    ServiceMappingController,
  ],
  exports: [
    ProviderClientFactory,
    SmmProviderService,
    ServiceMappingService,
  ],
})
export class SmmModule {}
