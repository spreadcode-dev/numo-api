import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DATABASE_HEALTH_INDICATOR,
  type DatabaseHealthIndicator,
} from '../application/database-health-indicator.js';

export type HealthResponse = {
  status: 'ok';
};

export type DatabaseHealthResponse = {
  status: 'ok' | 'error';
  database: 'up' | 'down';
};

const DATABASE_DOWN_RESPONSE = { status: 'error', database: 'down' } as const;

@Controller('health')
export class HealthController {
  constructor(
    @Inject(DATABASE_HEALTH_INDICATOR)
    private readonly databaseHealthIndicator: DatabaseHealthIndicator,
  ) {}

  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
    };
  }

  @Get('db')
  async getDatabaseHealth(): Promise<DatabaseHealthResponse> {
    const isDatabaseUp = await this.databaseHealthIndicator.isUp();
    if (!isDatabaseUp) {
      throw new ServiceUnavailableException(DATABASE_DOWN_RESPONSE);
    }

    return {
      status: 'ok',
      database: 'up',
    };
  }
}
