import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../../../shared/auth/public.decorator.js';
import {
  type AccessTokenConfig,
  createJwtModuleOptions,
} from '../infrastructure/access-token.config.js';
import { JwtAccessTokenService } from '../infrastructure/jwt-access-token.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const CONFIG: AccessTokenConfig = { secret: 'a'.repeat(32), ttlSeconds: 900 };
const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';

class ProtectedController {
  route(this: void): void {}

  @Public()
  publicRoute(this: void): void {}
}

@Public()
class PublicController {
  route(this: void): void {}
}

type Route = {
  controller: new () => object;
  handler: () => void;
};

const PROTECTED_ROUTE: Route = {
  controller: ProtectedController,
  handler: ProtectedController.prototype.route,
};

const tokenService = new JwtAccessTokenService(
  new JwtService(createJwtModuleOptions(CONFIG)),
  CONFIG,
);

const guard = new JwtAuthGuard(new Reflector(), tokenService);

const requestTo = (route: Route, authorization?: string) => {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    getHandler: () => route.handler,
    getClass: () => route.controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
};

describe('JwtAuthGuard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should let a request through to a route marked @Public()', async () => {
    // Arrange
    const { context } = requestTo({
      controller: ProtectedController,
      handler: ProtectedController.prototype.publicRoute,
    });

    // Act
    const canActivate = await guard.canActivate(context);

    // Assert
    expect(canActivate).toBe(true);
  });

  it('should let a request through to a controller marked @Public()', async () => {
    // Arrange
    const { context } = requestTo({
      controller: PublicController,
      handler: PublicController.prototype.route,
    });

    // Act
    const canActivate = await guard.canActivate(context);

    // Assert
    expect(canActivate).toBe(true);
  });

  it('should attach the user to the request when the token is valid', async () => {
    // Arrange
    const { value } = await tokenService.issue(USER_ID);
    const { context, request } = requestTo(PROTECTED_ROUTE, `Bearer ${value}`);

    // Act
    const canActivate = await guard.canActivate(context);

    // Assert
    expect(canActivate).toBe(true);
    expect(request.user).toEqual({ id: USER_ID });
  });

  it('should reject a request without a token', async () => {
    // Arrange
    const { context } = requestTo(PROTECTED_ROUTE);

    // Act
    const canActivate = guard.canActivate(context);

    // Assert
    await expect(canActivate).rejects.toThrow(UnauthorizedException);
  });

  it('should reject a token sent with another scheme than Bearer', async () => {
    // Arrange
    const { value } = await tokenService.issue(USER_ID);
    const { context } = requestTo(PROTECTED_ROUTE, `Basic ${value}`);

    // Act
    const canActivate = guard.canActivate(context);

    // Assert
    await expect(canActivate).rejects.toThrow(UnauthorizedException);
  });

  it('should reject an expired token', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['Date'] });
    const { value } = await tokenService.issue(USER_ID);
    vi.setSystemTime(Date.now() + (CONFIG.ttlSeconds + 1) * 1_000);
    const { context } = requestTo(PROTECTED_ROUTE, `Bearer ${value}`);

    // Act
    const canActivate = guard.canActivate(context);

    // Assert
    await expect(canActivate).rejects.toThrow(UnauthorizedException);
  });

  it('should reject a token with a tampered signature', async () => {
    // Arrange
    const { value } = await tokenService.issue(USER_ID);
    const [header, payload] = value.split('.');
    const forgedSignature = 'A'.repeat(43);
    const { context } = requestTo(
      PROTECTED_ROUTE,
      `Bearer ${header}.${payload}.${forgedSignature}`,
    );

    // Act
    const canActivate = guard.canActivate(context);

    // Assert
    await expect(canActivate).rejects.toThrow(UnauthorizedException);
  });
});
