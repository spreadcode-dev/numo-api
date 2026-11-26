import { toTransferAmount } from './transfer-amount.js';
import { InvalidTransferAmountError } from './transactions.errors.js';

describe('toTransferAmount', () => {
  it('should accept a positive whole number of cents', () => {
    // Act
    const amount = toTransferAmount(50000);

    // Assert
    expect(amount).toBe(50000);
  });

  it.each([0, -1, 10.5, Number.MAX_SAFE_INTEGER + 1])(
    'should reject %s',
    (amount) => {
      // Act
      const create = () => toTransferAmount(amount);

      // Assert
      expect(create).toThrow(InvalidTransferAmountError);
    },
  );
});
