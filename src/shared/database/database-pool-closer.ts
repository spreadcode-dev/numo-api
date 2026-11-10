import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from './database.tokens.js';

@Injectable()
export class DatabasePoolCloser implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabasePoolCloser.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Closing database pool due to signal: ${signal}`);
    await this.pool.end();
  }
}
