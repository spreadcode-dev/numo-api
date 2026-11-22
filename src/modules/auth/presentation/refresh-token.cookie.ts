import type { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import type { IssuedRefreshToken } from '../application/refresh-tokens.js';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const REFRESH_TOKEN_COOKIE_OPTIONS = Symbol(
  'REFRESH_TOKEN_COOKIE_OPTIONS',
);

const DEFAULT_COOKIE_PATH = '/auth';

// HttpOnly: page scripts can't read it. Secure + SameSite=Strict: sent only over
// HTTPS (browsers treat localhost as secure) and never on cross-site requests.
// Path: the browser sends it to the auth routes only. It's configurable because a
// client that proxies the API under a prefix (e.g. /api) sees those routes there.
export const loadRefreshTokenCookieOptions = (
  configService: ConfigService,
): CookieOptions => ({
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: readCookiePath(configService),
});

const readCookiePath = (configService: ConfigService): string => {
  const path = configService.get<string>(
    'REFRESH_TOKEN_COOKIE_PATH',
    DEFAULT_COOKIE_PATH,
  );
  if (!path.startsWith('/')) {
    throw new Error(
      `REFRESH_TOKEN_COOKIE_PATH must start with "/" (e.g. /auth), got "${path}"`,
    );
  }
  return path;
};

export const setRefreshTokenCookie = (
  response: Response,
  refreshToken: IssuedRefreshToken,
  cookieOptions: CookieOptions,
): void => {
  response.cookie(REFRESH_TOKEN_COOKIE, refreshToken.value, {
    ...cookieOptions,
    expires: refreshToken.expiresAt,
  });
};

export const clearRefreshTokenCookie = (
  response: Response,
  cookieOptions: CookieOptions,
): void => {
  response.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);
};

export const readRefreshTokenCookie = (
  request: Request,
): string | undefined => {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[REFRESH_TOKEN_COOKIE];
  return typeof value === 'string' ? value : undefined;
};
