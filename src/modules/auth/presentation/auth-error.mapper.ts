import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  EmailAlreadyRegisteredError,
  InvalidAccessTokenError,
  InvalidCredentialsError,
  InvalidEmailError,
  InvalidPasswordError,
  UserNotFoundError,
} from '../domain/auth.errors.js';

export const toHttpError = (error: unknown): unknown => {
  if (error instanceof EmailAlreadyRegisteredError) {
    return new ConflictException(error.message);
  }

  if (
    error instanceof InvalidEmailError ||
    error instanceof InvalidPasswordError
  ) {
    return new BadRequestException(error.message);
  }

  if (
    error instanceof InvalidCredentialsError ||
    error instanceof InvalidAccessTokenError ||
    error instanceof UserNotFoundError
  ) {
    return new UnauthorizedException(error.message);
  }

  return error;
};
