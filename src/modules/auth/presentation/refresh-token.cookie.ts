import type { CookieOptions, Request, Response } from 'express';
import type { IssuedRefreshToken } from '../application/refresh-tokens.js';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// HttpOnly: page scripts can't read it. Secure + SameSite=Strict: sent only over
// HTTPS (browsers treat localhost as secure) and never on cross-site requests.
// Path=/auth: the browser sends it to the auth routes only.
const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/auth',
};

export const setRefreshTokenCookie = (
  response: Response,
  refreshToken: IssuedRefreshToken,
): void => {
  response.cookie(REFRESH_TOKEN_COOKIE, refreshToken.value, {
    ...REFRESH_TOKEN_COOKIE_OPTIONS,
    expires: refreshToken.expiresAt,
  });
};

export const clearRefreshTokenCookie = (response: Response): void => {
  response.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE_OPTIONS);
};

export const readRefreshTokenCookie = (
  request: Request,
): string | undefined => {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[REFRESH_TOKEN_COOKIE];
  return typeof value === 'string' ? value : undefined;
};
