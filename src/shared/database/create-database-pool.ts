import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

// Fail fast when Postgres is unreachable instead of hanging the request.
const CONNECTION_TIMEOUT_MS = 2_000; // 2 seconds

export const createDatabasePool = (configService: ConfigService): Pool => {
  return new Pool({
    host: configService.getOrThrow<string>('DB_HOST'),
    port: Number(configService.getOrThrow<string>('DB_PORT')),
    database: configService.getOrThrow<string>('DB_NAME'),
    user: configService.getOrThrow<string>('DB_APP_USER'),
    password: configService.getOrThrow<string>('DB_APP_PASSWORD'),
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
};
