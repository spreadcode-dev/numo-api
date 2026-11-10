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
import { ApiServiceUnavailableResponse } from '@nestjs/swagger';
import {
  DatabaseHealthResponseDto,
  HealthResponseDto,
} from './health-response.dto.js';

const DATABASE_DOWN_RESPONSE = { status: 'error', database: 'down' } as const;

@Controller('health')
export class HealthController {
  constructor(
    @Inject(DATABASE_HEALTH_INDICATOR)
    private readonly databaseHealthIndicator: DatabaseHealthIndicator,
  ) {}

  @Get()
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
    };
  }

  @ApiServiceUnavailableResponse({ type: DatabaseHealthResponseDto })
  @Get('db')
  async getDatabaseHealth(): Promise<DatabaseHealthResponseDto> {
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
