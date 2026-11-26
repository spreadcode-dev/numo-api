import { toTransactionAmount } from './transaction-amount.js';
import { InvalidTransactionAmountError } from './transactions.errors.js';

describe('toTransactionAmount', () => {
  it.each([-4590, 250000])('should accept %i cents', (amount) => {
    // Act
    const cents = toTransactionAmount(amount);

    // Assert
    expect(cents).toBe(amount);
  });

  it.each([0, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN])(
    'should reject %d',
    (amount) => {
      // Act
      const convert = () => toTransactionAmount(amount);

      // Assert
      expect(convert).toThrow(InvalidTransactionAmountError);
    },
  );
});
