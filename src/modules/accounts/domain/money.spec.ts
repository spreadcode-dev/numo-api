import { InvalidAmountError } from './accounts.errors.js';
import { toCents } from './money.js';

describe('toCents', () => {
  it.each([0, -150000, Number.MAX_SAFE_INTEGER])(
    'should accept the whole number %d',
    (amount) => {
      // Act
      const cents = toCents(amount);

      // Assert
      expect(cents).toBe(amount);
    },
  );

  it.each([1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Infinity])(
    'should reject %d',
    (amount) => {
      // Act
      const convert = () => toCents(amount);

      // Assert
      expect(convert).toThrow(InvalidAmountError);
    },
  );
});
