import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvalidTransactionAmountError,
  InvalidTransactionDateError,
  InvalidTransactionDescriptionError,
  TransactionAccountArchivedError,
  TransactionAccountNotFoundError,
} from '../domain/transactions.errors.js';

const INVALID_INPUT_ERRORS = [
  InvalidTransactionAmountError,
  InvalidTransactionDateError,
  InvalidTransactionDescriptionError,
];

const isInvalidInput = (error: unknown): error is Error =>
  INVALID_INPUT_ERRORS.some((invalidInput) => error instanceof invalidInput);

export const toHttpError = (error: unknown): unknown => {
  if (error instanceof TransactionAccountNotFoundError) {
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
