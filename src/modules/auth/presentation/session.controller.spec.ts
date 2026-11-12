import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { LoginUseCase } from '../application/login.use-case.js';
import type { LogoutUseCase } from '../application/logout.use-case.js';
import type { RefreshSessionUseCase } from '../application/refresh-session.use-case.js';
import {
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '../domain/auth.errors.js';
import { SessionController } from './session.controller.js';

const LOGIN_REQUEST = {
  email: 'ana@example.com',
  password: 'correct-horse-battery',
};
const EXPIRES_AT = new Date('2026-11-17T12:00:00Z');

const SESSION = {
  accessToken: { value: 'signed.jwt.token', expiresInSeconds: 900 },
  refreshToken: { value: 'new-refresh-token', expiresAt: EXPIRES_AT },
};

const ACCESS_TOKEN_RESPONSE = {
  accessToken: 'signed.jwt.token',
  tokenType: 'Bearer',
  expiresIn: 900,
};

type UseCaseFakes = {
  login?: LoginUseCase['execute'];
  refreshSession?: RefreshSessionUseCase['execute'];
  logout?: LogoutUseCase['execute'];
};

const controllerWith = (fakes: UseCaseFakes) =>
  new SessionController(
    { execute: fakes.login ?? vi.fn() } as LoginUseCase,
    { execute: fakes.refreshSession ?? vi.fn() } as RefreshSessionUseCase,
    { execute: fakes.logout ?? vi.fn() } as LogoutUseCase,
  );

const fakeResponse = () => {
  const cookie = vi.fn();
  const clearCookie = vi.fn();
  const response = { cookie, clearCookie } as unknown as Response;
  return { response, cookie, clearCookie };
};

const requestWithCookies = (cookies: Record<string, string>): Request =>
  ({ cookies }) as unknown as Request;

describe('SessionController', () => {
  it('should return a Bearer access token on login', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(SESSION);
    const controller = controllerWith({ login: execute });

    // Act
    const body = await controller.login(LOGIN_REQUEST, fakeResponse().response);

    // Assert
    expect(body).toEqual(ACCESS_TOKEN_RESPONSE);
    expect(execute).toHaveBeenCalledWith(LOGIN_REQUEST);
  });

  it('should set the refresh token cookie on login', async () => {
    // Arrange
    const controller = controllerWith({
      login: vi.fn().mockResolvedValue(SESSION),
    });
    const { response, cookie } = fakeResponse();

    // Act
    await controller.login(LOGIN_REQUEST, response);

    // Assert
    expect(cookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh-token',
      expect.objectContaining({ expires: EXPIRES_AT }),
    );
  });

  it('should answer 401 when the login credentials are invalid', async () => {
    // Arrange
    const controller = controllerWith({
      login: vi.fn().mockRejectedValue(new InvalidCredentialsError()),
    });

    // Act
    const login = controller.login(LOGIN_REQUEST, fakeResponse().response);

    // Assert
    await expect(login).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should refresh with the token from the cookie and return a new access token', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(SESSION);
    const controller = controllerWith({ refreshSession: execute });
    const request = requestWithCookies({ refresh_token: 'old-refresh-token' });

    // Act
    const body = await controller.refresh(request, fakeResponse().response);

    // Assert
    expect(body).toEqual(ACCESS_TOKEN_RESPONSE);
    expect(execute).toHaveBeenCalledWith('old-refresh-token');
  });

  it('should set the rotated refresh token cookie on refresh', async () => {
    // Arrange
    const controller = controllerWith({
      refreshSession: vi.fn().mockResolvedValue(SESSION),
    });
    const request = requestWithCookies({ refresh_token: 'old-refresh-token' });
    const { response, cookie } = fakeResponse();

    // Act
    await controller.refresh(request, response);

    // Assert
    expect(cookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh-token',
      expect.any(Object),
    );
  });

  it('should answer 401 when refreshing without a cookie', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new InvalidRefreshTokenError());
    const controller = controllerWith({ refreshSession: execute });

    // Act
    const refresh = controller.refresh(
      requestWithCookies({}),
      fakeResponse().response,
    );

    // Assert
    await expect(refresh).rejects.toBeInstanceOf(UnauthorizedException);
    expect(execute).toHaveBeenCalledWith(undefined);
  });

  it('should revoke the refresh token from the cookie on logout', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(undefined);
    const controller = controllerWith({ logout: execute });
    const request = requestWithCookies({ refresh_token: 'current-token' });

    // Act
    await controller.logout(request, fakeResponse().response);

    // Assert
    expect(execute).toHaveBeenCalledWith('current-token');
  });

  it('should clear the refresh token cookie on logout', async () => {
    // Arrange
    const controller = controllerWith({
      logout: vi.fn().mockResolvedValue(undefined),
    });
    const { response, clearCookie } = fakeResponse();

    // Act
    await controller.logout(requestWithCookies({}), response);

    // Assert
    expect(clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/auth' }),
    );
  });
});
