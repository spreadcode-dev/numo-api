import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabasePool } from './create-database-pool.js';
import { DatabasePoolCloser } from './database-pool-closer.js';
import { PG_POOL } from './database.tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: createDatabasePool,
    },
    DatabasePoolCloser,
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
