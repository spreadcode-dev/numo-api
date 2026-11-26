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
  InvalidTransactionLabelsError,
  InvalidTransferAmountError,
  SameTransferAccountError,
  TransactionAccountArchivedError,
  TransactionAccountNotFoundError,
  TransactionIsTransferLegError,
  TransactionLabelNotFoundError,
  TransactionNotFoundError,
  TransferNotFoundError,
} from '../domain/transactions.errors.js';
import { toHttpError } from './transactions-error.mapper.js';

describe('toHttpError', () => {
  it('should map a missing account to 404', () => {
    // Act
    const httpError = toHttpError(new TransactionAccountNotFoundError());

    // Assert
    expect(httpError).toBeInstanceOf(NotFoundException);
  });

  it('should map a missing transaction to 404', () => {
    // Act
    const httpError = toHttpError(new TransactionNotFoundError());

    // Assert
    expect(httpError).toBeInstanceOf(NotFoundException);
  });

  it('should map a missing label to 404', () => {
    // Act
    const httpError = toHttpError(new TransactionLabelNotFoundError());

    // Assert
    expect(httpError).toBeInstanceOf(NotFoundException);
  });

  it('should map a missing transfer to 404', () => {
    // Act
    const httpError = toHttpError(new TransferNotFoundError());

    // Assert
    expect(httpError).toBeInstanceOf(NotFoundException);
  });

  it('should map a change to a single transfer leg to 409', () => {
    // Act
    const httpError = toHttpError(new TransactionIsTransferLegError());

    // Assert
    expect(httpError).toBeInstanceOf(ConflictException);
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
    new InvalidTransactionLabelsError(),
    new InvalidTransferAmountError(),
    new SameTransferAccountError(),
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
