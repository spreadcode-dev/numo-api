import { BadRequestException } from '@nestjs/common';
import {
  InvalidMonthCountError,
  InvalidYearMonthError,
} from '../domain/reports.errors.js';

const isInvalidInput = (error: unknown): error is Error =>
  error instanceof InvalidMonthCountError ||
  error instanceof InvalidYearMonthError;

export const toHttpError = (error: unknown): unknown =>
  isInvalidInput(error) ? new BadRequestException(error.message) : error;
