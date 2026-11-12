import type { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { parseDurationSeconds } from '../../../shared/config/duration.js';

export const ACCESS_TOKEN_CONFIG = Symbol('ACCESS_TOKEN_CONFIG');

// RFC 7518 §3.2: an HS256 key must be at least as long as its 256-bit output.
const MIN_SECRET_BYTES = 32;
const DEFAULT_TTL = '15m';

const ALGORITHM = 'HS256';
const ISSUER = 'numo-api';
const AUDIENCE = 'numo-web';

export type AccessTokenConfig = {
  secret: string;
  ttlSeconds: number;
};

export const loadAccessTokenConfig = (
  configService: ConfigService,
): AccessTokenConfig => ({
  secret: readSecret(configService),
  ttlSeconds: parseDurationSeconds(
    'JWT_ACCESS_TTL',
    configService.get<string>('JWT_ACCESS_TTL', DEFAULT_TTL),
  ),
});

export const createJwtModuleOptions = (
  config: AccessTokenConfig,
): JwtModuleOptions => ({
  secret: config.secret,
  signOptions: {
    algorithm: ALGORITHM,
    expiresIn: config.ttlSeconds,
    issuer: ISSUER,
    audience: AUDIENCE,
  },
  // Pinning the algorithm rejects "alg: none" and algorithm-switching tokens.
  verifyOptions: {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
    audience: AUDIENCE,
  },
});

const readSecret = (configService: ConfigService): string => {
  const secret = configService.get<string>('JWT_ACCESS_SECRET') ?? '';
  if (Buffer.byteLength(secret) < MIN_SECRET_BYTES) {
    throw new Error(
      `JWT_ACCESS_SECRET must be at least ${MIN_SECRET_BYTES} bytes; generate one with: openssl rand -base64 48`,
    );
  }
  return secret;
};
