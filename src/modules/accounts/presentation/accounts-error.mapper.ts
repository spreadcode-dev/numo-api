import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  AccountNameAlreadyUsedError,
  InvalidAccountNameError,
  InvalidAccountTypeError,
  InvalidAmountError,
  UnsupportedCurrencyError,
} from '../domain/accounts.errors.js';

const INVALID_INPUT_ERRORS = [
  InvalidAccountNameError,
  InvalidAccountTypeError,
  InvalidAmountError,
  UnsupportedCurrencyError,
];

const isInvalidInput = (error: unknown): error is Error =>
  INVALID_INPUT_ERRORS.some((invalidInput) => error instanceof invalidInput);

export const toHttpError = (error: unknown): unknown => {
  if (error instanceof AccountNameAlreadyUsedError) {
    return new ConflictException(error.message);
  }

  if (isInvalidInput(error)) {
    return new BadRequestException(error.message);
  }

  return error;
};
