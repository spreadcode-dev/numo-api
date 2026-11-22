import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  clearRefreshTokenCookie,
  loadRefreshTokenCookieOptions,
  readRefreshTokenCookie,
  setRefreshTokenCookie,
} from './refresh-token.cookie.js';

const EXPIRES_AT = new Date('2026-11-17T12:00:00Z');

const fakeResponse = () => {
  const cookie = vi.fn();
  const clearCookie = vi.fn();
  const response = { cookie, clearCookie } as unknown as Response;
  return { response, cookie, clearCookie };
};

const requestWithCookies = (cookies: unknown): Request =>
  ({ cookies }) as unknown as Request;

const configWith = (environment: Record<string, string>) =>
  new ConfigService(environment);

describe('loadRefreshTokenCookieOptions', () => {
  it('should default to an HttpOnly, Secure, SameSite=Strict cookie on /auth', () => {
    // Arrange
    const configService = configWith({});

    // Act
    const options = loadRefreshTokenCookieOptions(configService);

    // Assert
    expect(options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
    });
  });

  it('should read the cookie path from the environment', () => {
    // Arrange
    const configService = configWith({
      REFRESH_TOKEN_COOKIE_PATH: '/api/auth',
    });

    // Act
    const options = loadRefreshTokenCookieOptions(configService);

    // Assert
    expect(options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth',
    });
  });

  it.each(['api/auth', ''])(
    'should refuse to start with a cookie path of "%s"',
    (path) => {
      // Arrange
      const configService = configWith({ REFRESH_TOKEN_COOKIE_PATH: path });

      // Act
      const load = () => loadRefreshTokenCookieOptions(configService);

      // Assert
      expect(load).toThrow(
        `REFRESH_TOKEN_COOKIE_PATH must start with "/" (e.g. /auth), got "${path}"`,
      );
    },
  );
});

const DEFAULT_COOKIE_OPTIONS = loadRefreshTokenCookieOptions(configWith({}));
const API_PREFIXED_COOKIE_OPTIONS = loadRefreshTokenCookieOptions(
  configWith({ REFRESH_TOKEN_COOKIE_PATH: '/api/auth' }),
);

describe('setRefreshTokenCookie', () => {
  it('should set an HttpOnly, Secure, SameSite=Strict cookie on /auth that expires with the token', () => {
    // Arrange
    const { response, cookie } = fakeResponse();

    // Act
    setRefreshTokenCookie(
      response,
      { value: 'opaque-token', expiresAt: EXPIRES_AT },
      DEFAULT_COOKIE_OPTIONS,
    );

    // Assert
    expect(cookie).toHaveBeenCalledWith('refresh_token', 'opaque-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
      expires: EXPIRES_AT,
    });
  });

  it('should set the cookie on a configured path', () => {
    // Arrange
    const { response, cookie } = fakeResponse();

    // Act
    setRefreshTokenCookie(
      response,
      { value: 'opaque-token', expiresAt: EXPIRES_AT },
      API_PREFIXED_COOKIE_OPTIONS,
    );

    // Assert
    expect(cookie).toHaveBeenCalledWith(
      'refresh_token',
      'opaque-token',
      expect.objectContaining({ path: '/api/auth' }),
    );
  });
});

describe('clearRefreshTokenCookie', () => {
  it('should clear the cookie with the same path and flags it was set with', () => {
    // Arrange
    const { response, clearCookie } = fakeResponse();

    // Act
    clearRefreshTokenCookie(response, DEFAULT_COOKIE_OPTIONS);

    // Assert
    expect(clearCookie).toHaveBeenCalledWith('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
    });
  });

  it('should clear the cookie on a configured path', () => {
    // Arrange
    const { response, clearCookie } = fakeResponse();

    // Act
    clearRefreshTokenCookie(response, API_PREFIXED_COOKIE_OPTIONS);

    // Assert
    expect(clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/api/auth' }),
    );
  });
});

describe('readRefreshTokenCookie', () => {
  it('should return the cookie value', () => {
    // Act
    const value = readRefreshTokenCookie(
      requestWithCookies({ refresh_token: 'opaque-token' }),
    );

    // Assert
    expect(value).toBe('opaque-token');
  });

  it('should return undefined when the cookie is absent', () => {
    // Act
    const value = readRefreshTokenCookie(requestWithCookies({}));

    // Assert
    expect(value).toBeUndefined();
  });

  it('should return undefined when no cookies were parsed', () => {
    // Act
    const value = readRefreshTokenCookie(requestWithCookies(undefined));

    // Assert
    expect(value).toBeUndefined();
  });

  it('should ignore a value that is not a string', () => {
    // Act
    const value = readRefreshTokenCookie(
      requestWithCookies({ refresh_token: { injected: true } }),
    );

    // Assert
    expect(value).toBeUndefined();
  });
});
