import { Module } from '@nestjs/common';
import { DATABASE_HEALTH_INDICATOR } from './application/database-health-indicator.js';
import { PgDatabaseHealthIndicator } from './infrastructure/pg-database-health-indicator.js';
import { HealthController } from './presentation/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: DATABASE_HEALTH_INDICATOR,
      useClass: PgDatabaseHealthIndicator,
    },
  ],
})
export class HealthModule {}
