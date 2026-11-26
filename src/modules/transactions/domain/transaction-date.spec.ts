import { TransactionDate } from './transaction-date.js';
import { InvalidTransactionDateError } from './transactions.errors.js';

describe('TransactionDate', () => {
  it.each(['2026-11-20', '2028-02-29', '1999-12-31'])(
    'should accept the calendar day %s unchanged',
    (raw) => {
      // Act
      const date = TransactionDate.create(raw);

      // Assert
      expect(date.value).toBe(raw);
    },
  );

  it.each([
    '2026-02-30',
    '2026-02-29',
    '2026-13-01',
    '2026-00-10',
    '20-11-2026',
    '2026-11-20T10:00',
    '2026-1-5',
    '',
  ])('should reject %j', (raw) => {
    // Act
    const create = () => TransactionDate.create(raw);

    // Assert
    expect(create).toThrow(InvalidTransactionDateError);
  });
});
