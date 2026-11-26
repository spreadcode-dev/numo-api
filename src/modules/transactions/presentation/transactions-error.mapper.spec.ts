import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvalidPageCursorError,
  InvalidPageLimitError,
  InvalidTransactionAmountError,
  InvalidTransactionDateError,
  InvalidTransactionDescriptionError,
  TransactionAccountArchivedError,
  TransactionAccountNotFoundError,
} from '../domain/transactions.errors.js';
import { toHttpError } from './transactions-error.mapper.js';

describe('toHttpError', () => {
  it('should map a missing account to 404', () => {
    // Act
    const httpError = toHttpError(new TransactionAccountNotFoundError());

    // Assert
    expect(httpError).toBeInstanceOf(NotFoundException);
  });

  it('should map an archived account to 409', () => {
    // Act
    const httpError = toHttpError(new TransactionAccountArchivedError());

    // Assert
    expect(httpError).toBeInstanceOf(ConflictException);
  });

  it.each([
    new InvalidTransactionAmountError(),
    new InvalidTransactionDateError(),
    new InvalidTransactionDescriptionError(),
    new InvalidPageLimitError(),
    new InvalidPageCursorError(),
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
