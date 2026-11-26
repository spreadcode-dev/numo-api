import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import { TransactionIsTransferLegError } from '../domain/transactions.errors.js';
import { ensureNotTransferLeg } from './ensure-not-transfer-leg.js';

const createdAt = new Date('2026-11-26T12:00:00Z');
const MARKET = {
  id: 'transaction-1',
  userId: 'user-ana',
  accountId: 'account-1',
  date: TransactionDate.create('2026-11-20'),
  amount: -4590,
  description: TransactionDescription.create('Market'),
  createdAt,
  updatedAt: createdAt,
};

describe('ensureNotTransferLeg', () => {
  it('should accept a transaction outside any transfer', () => {
    // Act
    const ensure = () => ensureNotTransferLeg(MARKET);

    // Assert
    expect(ensure).not.toThrow();
  });

  it('should reject a transfer leg', () => {
    // Act
    const ensure = () =>
      ensureNotTransferLeg({ ...MARKET, transferId: 'transfer-1' });

    // Assert
    expect(ensure).toThrow(TransactionIsTransferLegError);
  });
});
