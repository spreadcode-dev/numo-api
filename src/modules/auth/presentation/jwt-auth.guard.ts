import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../../shared/auth/public.decorator.js';
import {
  ACCESS_TOKEN_VERIFIER,
  type AccessTokenVerifier,
} from '../domain/access-token.js';
import { InvalidAccessTokenError } from '../domain/auth.errors.js';
import { toHttpError } from './auth-error.mapper.js';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from './authenticated-request.js';

const BEARER_SCHEME = 'bearer';

const extractBearerToken = (request: Request): string | undefined => {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme?.toLowerCase() === BEARER_SCHEME ? token : undefined;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ACCESS_TOKEN_VERIFIER)
    private readonly accessTokenVerifier: AccessTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    try {
      request.user = await this.authenticate(request);
    } catch (error) {
      throw toHttpError(error);
    }

    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic === true;
  }

  private async authenticate(request: Request): Promise<AuthenticatedUser> {
    const token = extractBearerToken(request);
    if (!token) {
      throw new InvalidAccessTokenError('Missing access token');
    }
    const claims = await this.accessTokenVerifier.verify(token);
    return { id: claims.userId };
  }
}
