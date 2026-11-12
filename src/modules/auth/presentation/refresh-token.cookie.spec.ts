import type { Request, Response } from 'express';
import {
  clearRefreshTokenCookie,
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

describe('setRefreshTokenCookie', () => {
  it('should set an HttpOnly, Secure, SameSite=Strict cookie on /auth that expires with the token', () => {
    // Arrange
    const { response, cookie } = fakeResponse();

    // Act
    setRefreshTokenCookie(response, {
      value: 'opaque-token',
      expiresAt: EXPIRES_AT,
    });

    // Assert
    expect(cookie).toHaveBeenCalledWith('refresh_token', 'opaque-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
      expires: EXPIRES_AT,
    });
  });
});

describe('clearRefreshTokenCookie', () => {
  it('should clear the cookie with the same path and flags it was set with', () => {
    // Arrange
    const { response, clearCookie } = fakeResponse();

    // Act
    clearRefreshTokenCookie(response);

    // Assert
    expect(clearCookie).toHaveBeenCalledWith('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
    });
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
