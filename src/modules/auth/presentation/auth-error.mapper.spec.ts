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
import { toHttpError } from './auth-error.mapper.js';

describe('toHttpError', () => {
  it('should map an already registered email to 409', () => {
    // Act
    const httpError = toHttpError(new EmailAlreadyRegisteredError());

    // Assert
    expect(httpError).toBeInstanceOf(ConflictException);
  });

  it('should map an invalid email to 400', () => {
    // Act
    const httpError = toHttpError(new InvalidEmailError());

    // Assert
    expect(httpError).toBeInstanceOf(BadRequestException);
  });

  it('should map an invalid password to 400', () => {
    // Act
    const httpError = toHttpError(new InvalidPasswordError());

    // Assert
    expect(httpError).toBeInstanceOf(BadRequestException);
  });

  it.each([
    new InvalidCredentialsError(),
    new InvalidAccessTokenError(),
    new UserNotFoundError(),
  ])('should map $name to 401 with its message', (error) => {
    // Act
    const httpError = toHttpError(error);

    // Assert
    expect(httpError).toBeInstanceOf(UnauthorizedException);
    expect((httpError as UnauthorizedException).message).toBe(error.message);
  });

  it('should pass any other error through unchanged', () => {
    // Arrange
    const unexpected = new Error('connect ECONNREFUSED');

    // Act
    const httpError = toHttpError(unexpected);

    // Assert
    expect(httpError).toBe(unexpected);
  });
});
