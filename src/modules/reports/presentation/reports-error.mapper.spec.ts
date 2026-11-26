import { BadRequestException } from '@nestjs/common';
import {
  InvalidMonthCountError,
  InvalidYearMonthError,
} from '../domain/reports.errors.js';
import { toHttpError } from './reports-error.mapper.js';

describe('toHttpError', () => {
  it.each([new InvalidMonthCountError(), new InvalidYearMonthError()])(
    'should map %s to 400 with its message',
    (error) => {
      // Act
      const httpError = toHttpError(error);

      // Assert
      expect(httpError).toBeInstanceOf(BadRequestException);
      expect((httpError as BadRequestException).message).toBe(error.message);
    },
  );

  it('should pass any other error through unchanged', () => {
    // Arrange
    const error = new Error('connection lost');

    // Act
    const httpError = toHttpError(error);

    // Assert
    expect(httpError).toBe(error);
  });
});
