import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  EmailAlreadyRegisteredError,
  InvalidEmailError,
  InvalidPasswordError,
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

  return error;
};
