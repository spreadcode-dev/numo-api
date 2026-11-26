import { TransactionNotFoundError } from '../domain/transactions.errors.js';
import { DeleteTransactionUseCase } from './delete-transaction.use-case.js';
import { RecordTransactionUseCase } from './record-transaction.use-case.js';
import { InMemoryAccountLookup } from './testing/account-lookup.fake.js';
import { InMemoryTransactionRepository } from './testing/transaction-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';
const ANA_ACCOUNT = 'account-ana';

const setUp = async () => {
  const transactionRepository = new InMemoryTransactionRepository();
  const accountLookup = new InMemoryAccountLookup();
  accountLookup.accounts.push({
    id: ANA_ACCOUNT,
    userId: ANA,
    isArchived: false,
  });
  const transaction = await new RecordTransactionUseCase(
    transactionRepository,
    accountLookup,
  ).execute({
    userId: ANA,
    accountId: ANA_ACCOUNT,
    date: '2026-11-20',
    amount: -4590,
    description: 'Market',
  });
  return {
    transactionRepository,
    accountLookup,
    transaction,
    deleteTransaction: new DeleteTransactionUseCase(transactionRepository),
  };
};

describe('DeleteTransactionUseCase', () => {
  it("should remove the user's transaction", async () => {
    // Arrange
    const { transactionRepository, transaction, deleteTransaction } =
      await setUp();

    // Act
    await deleteTransaction.execute({
      userId: ANA,
      transactionId: transaction.id,
    });

    // Assert
    expect(transactionRepository.transactions).toEqual([]);
  });

  it('should remove a transaction even when its account is archived', async () => {
    // Arrange
    const {
      transactionRepository,
      accountLookup,
      transaction,
      deleteTransaction,
    } = await setUp();
    accountLookup.accounts[0].isArchived = true;

    // Act
    await deleteTransaction.execute({
      userId: ANA,
      transactionId: transaction.id,
    });

    // Assert
    expect(transactionRepository.transactions).toEqual([]);
  });

  it("should not delete another user's transaction", async () => {
    // Arrange
    const { transactionRepository, transaction, deleteTransaction } =
      await setUp();

    // Act
    const remove = deleteTransaction.execute({
      userId: BRUNO,
      transactionId: transaction.id,
    });

    // Assert
    await expect(remove).rejects.toThrow(TransactionNotFoundError);
    expect(transactionRepository.transactions).toHaveLength(1);
  });

  it('should reject an unknown transaction', async () => {
    // Arrange
    const { deleteTransaction } = await setUp();

    // Act
    const remove = deleteTransaction.execute({
      userId: ANA,
      transactionId: 'transaction-unknown',
    });

    // Assert
    await expect(remove).rejects.toThrow(TransactionNotFoundError);
  });
});
