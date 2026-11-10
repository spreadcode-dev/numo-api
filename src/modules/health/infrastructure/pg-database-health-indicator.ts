import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../shared/database/database.tokens.js';
import type { DatabaseHealthIndicator } from '../application/database-health-indicator.js';

@Injectable()
export class PgDatabaseHealthIndicator implements DatabaseHealthIndicator {
  private readonly log = new Logger(PgDatabaseHealthIndicator.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  async isUp(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      this.log.error('Database health check failed', error as Error);
      return false;
    }
  }
}
