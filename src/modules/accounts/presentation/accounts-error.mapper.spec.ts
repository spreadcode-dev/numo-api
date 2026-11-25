import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountNameAlreadyUsedError,
  AccountNotFoundError,
  InvalidAccountNameError,
  InvalidAccountTypeError,
  InvalidAmountError,
  UnsupportedCurrencyError,
} from '../domain/accounts.errors.js';
import { toHttpError } from './accounts-error.mapper.js';

describe('toHttpError', () => {
  it('should map a name already used to 409', () => {
    // Act
    const httpError = toHttpError(new AccountNameAlreadyUsedError());

    // Assert
    expect(httpError).toBeInstanceOf(ConflictException);
  });

  it('should map a missing account to 404', () => {
    // Act
    const httpError = toHttpError(new AccountNotFoundError());

    // Assert
    expect(httpError).toBeInstanceOf(NotFoundException);
  });

  it.each([
    new InvalidAccountNameError(),
    new InvalidAccountTypeError(),
    new InvalidAmountError(),
    new UnsupportedCurrencyError(),
  ])('should map $name to 400 with its message', (error) => {
    // Act
    const httpError = toHttpError(error);

    // Assert
    expect(httpError).toBeInstanceOf(BadRequestException);
    expect((httpError as BadRequestException).message).toBe(error.message);
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
