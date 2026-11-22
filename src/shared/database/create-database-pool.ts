import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

// Fail fast when Postgres is unreachable instead of hanging the request.
const CONNECTION_TIMEOUT_MS = 2_000; // 2 seconds

const logger = new Logger('DatabasePool');

export const createDatabasePool = (configService: ConfigService): Pool => {
  const pool = new Pool({
    host: configService.getOrThrow<string>('DB_HOST'),
    port: Number(configService.getOrThrow<string>('DB_PORT')),
    database: configService.getOrThrow<string>('DB_NAME'),
    user: configService.getOrThrow<string>('DB_APP_USER'),
    password: configService.getOrThrow<string>('DB_APP_PASSWORD'),
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  // An idle connection that Postgres closes (restart, stop) emits 'error' on the pool;
  // unhandled, Node turns that event into a crash of the whole API.
  pool.on('error', logIdleConnectionError);
  return pool;
};

const logIdleConnectionError = (error: Error): void => {
  logger.error(`Idle database connection lost: ${error.message}`);
};
