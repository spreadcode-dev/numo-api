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
  TransactionAccountArchivedError,
  TransactionAccountNotFoundError,
  TransactionLabelNotFoundError,
  TransactionNotFoundError,
} from '../domain/transactions.errors.js';

const INVALID_INPUT_ERRORS = [
  InvalidTransactionAmountError,
  InvalidTransactionDateError,
  InvalidTransactionDescriptionError,
  InvalidTransactionLabelsError,
  InvalidPageLimitError,
  InvalidPageCursorError,
];

const isInvalidInput = (error: unknown): error is Error =>
  INVALID_INPUT_ERRORS.some((invalidInput) => error instanceof invalidInput);

export const toHttpError = (error: unknown): unknown => {
  if (
    error instanceof TransactionNotFoundError ||
    error instanceof TransactionAccountNotFoundError ||
    error instanceof TransactionLabelNotFoundError
  ) {
    return new NotFoundException(error.message);
  }

  if (error instanceof TransactionAccountArchivedError) {
    return new ConflictException(error.message);
  }

  if (isInvalidInput(error)) {
    return new BadRequestException(error.message);
  }

  return error;
};
