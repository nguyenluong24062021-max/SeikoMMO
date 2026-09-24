import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import type { HealthCheckResponse } from '@repo/shared';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthCheckResponse {
    return this.appService.getHealth();
  }

  @Get()
  getHello(): { message: string } {
    return { message: this.appService.getHello() };
  }
}
