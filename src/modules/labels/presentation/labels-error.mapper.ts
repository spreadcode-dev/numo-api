import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvalidLabelColorError,
  InvalidLabelNameError,
  LabelNameAlreadyUsedError,
  LabelNotFoundError,
} from '../domain/labels.errors.js';

const isInvalidInput = (error: unknown): error is Error =>
  error instanceof InvalidLabelNameError ||
  error instanceof InvalidLabelColorError;

export const toHttpError = (error: unknown): unknown => {
  if (error instanceof LabelNotFoundError) {
    return new NotFoundException(error.message);
  }

  if (error instanceof LabelNameAlreadyUsedError) {
    return new ConflictException(error.message);
  }

  if (isInvalidInput(error)) {
    return new BadRequestException(error.message);
  }

  return error;
};
