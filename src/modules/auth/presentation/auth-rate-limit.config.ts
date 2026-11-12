import type { ConfigService } from '@nestjs/config';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { parseDurationSeconds } from '../../../shared/config/duration.js';

const DEFAULT_LIMIT = '5';
const DEFAULT_TTL = '1m';
const POSITIVE_WHOLE_NUMBER = /^[1-9]\d*$/;
const MILLISECONDS_PER_SECOND = 1_000;

export const loadAuthRateLimitOptions = (
  configService: ConfigService,
): ThrottlerModuleOptions => [
  {
    limit: readLimit(configService),
    ttl: readTtlMilliseconds(configService),
  },
];

const readLimit = (configService: ConfigService): number => {
  const limit = configService.get<string>('AUTH_THROTTLE_LIMIT', DEFAULT_LIMIT);
  if (!POSITIVE_WHOLE_NUMBER.test(limit)) {
    throw new Error(
      `AUTH_THROTTLE_LIMIT must be a positive whole number (e.g. 5), got "${limit}"`,
    );
  }
  return Number(limit);
};

const readTtlMilliseconds = (configService: ConfigService): number =>
  parseDurationSeconds(
    'AUTH_THROTTLE_TTL',
    configService.get<string>('AUTH_THROTTLE_TTL', DEFAULT_TTL),
  ) * MILLISECONDS_PER_SECOND;
