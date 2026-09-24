import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SmmModule } from '../smm/smm.module';

@Module({
  imports: [PrismaModule, SmmModule],
  providers: [TasksService],
})
export class TasksModule {}
