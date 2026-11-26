import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import { toTransactionView } from './transaction-view.js';

describe('toTransactionView', () => {
  it('should expose the values as plain text and hide the owner and timestamps', () => {
    // Arrange
    const createdAt = new Date('2026-11-26T12:00:00Z');
    const transaction = {
      id: 'transaction-1',
      userId: 'user-ana',
      accountId: 'account-1',
      date: TransactionDate.create('2026-11-20'),
      amount: -4590,
      description: TransactionDescription.create('Market'),
      createdAt,
      updatedAt: createdAt,
    };

    // Act
    const view = toTransactionView(transaction);

    // Assert
    expect(view).toEqual({
      id: 'transaction-1',
      accountId: 'account-1',
      date: '2026-11-20',
      amount: -4590,
      description: 'Market',
    });
  });
});
