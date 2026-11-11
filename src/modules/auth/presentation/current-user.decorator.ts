import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from './authenticated-request.js';

export const getCurrentUser = (
  _data: unknown,
  context: ExecutionContext,
): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
};

// The user the JwtAuthGuard attached to the request; only on protected routes.
export const CurrentUser = createParamDecorator(getCurrentUser);
