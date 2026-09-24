import { Injectable } from '@nestjs/common';
import type { HealthCheckResponse } from '@repo/shared';

@Injectable()
export class AppService {
  constructor() {}

  getHello(): string {
    return 'Seiko MMO API Server';
  }

  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
