import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import { TransactionNotFoundError } from '../domain/transactions.errors.js';
import { findOwnedTransaction } from './find-owned-transaction.js';
import { InMemoryTransactionRepository } from './testing/transaction-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const setUp = async () => {
  const transactionRepository = new InMemoryTransactionRepository();
  const transaction = await transactionRepository.create({
    userId: ANA,
    accountId: 'account-ana',
    date: TransactionDate.create('2026-11-20'),
    amount: -4590,
    description: TransactionDescription.create('Market'),
  });
  return { transactionRepository, transaction };
};

describe('findOwnedTransaction', () => {
  it("should return the user's transaction", async () => {
    // Arrange
    const { transactionRepository, transaction } = await setUp();

    // Act
    const found = await findOwnedTransaction(transactionRepository, {
      userId: ANA,
      transactionId: transaction.id,
    });

    // Assert
    expect(found).toEqual(transaction);
  });

  it("should not find another user's transaction", async () => {
    // Arrange
    const { transactionRepository, transaction } = await setUp();

    // Act
    const find = findOwnedTransaction(transactionRepository, {
      userId: BRUNO,
      transactionId: transaction.id,
    });

    // Assert
    await expect(find).rejects.toThrow(TransactionNotFoundError);
  });

  it('should not find an unknown transaction', async () => {
    // Arrange
    const { transactionRepository } = await setUp();

    // Act
    const find = findOwnedTransaction(transactionRepository, {
      userId: ANA,
      transactionId: 'transaction-unknown',
    });

    // Assert
    await expect(find).rejects.toThrow(TransactionNotFoundError);
  });
});
