import {
  InvalidTransactionAmountError,
  InvalidTransactionDateError,
  InvalidTransactionDescriptionError,
  TransactionAccountArchivedError,
  TransactionAccountNotFoundError,
  TransactionNotFoundError,
} from '../domain/transactions.errors.js';
import { RecordTransactionUseCase } from './record-transaction.use-case.js';
import { ReplaceTransactionUseCase } from './replace-transaction.use-case.js';
import { InMemoryAccountLookup } from './testing/account-lookup.fake.js';
import { InMemoryTransactionRepository } from './testing/transaction-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';
const ANA_ACCOUNT = 'account-ana';
const ANA_SAVINGS = 'account-ana-savings';
const ARCHIVED_ACCOUNT = 'account-ana-archived';
const BRUNO_ACCOUNT = 'account-bruno';

const MARKET = {
  userId: ANA,
  accountId: ANA_ACCOUNT,
  date: '2026-11-20',
  amount: -4590,
  description: 'Market',
};

const setUp = async () => {
  const transactionRepository = new InMemoryTransactionRepository();
  const accountLookup = new InMemoryAccountLookup();
  accountLookup.accounts.push(
    { id: ANA_ACCOUNT, userId: ANA, isArchived: false },
    { id: ANA_SAVINGS, userId: ANA, isArchived: false },
    { id: ARCHIVED_ACCOUNT, userId: ANA, isArchived: true },
    { id: BRUNO_ACCOUNT, userId: BRUNO, isArchived: false },
  );
  const recorded = await new RecordTransactionUseCase(
    transactionRepository,
    accountLookup,
  ).execute(MARKET);
  return {
    transactionRepository,
    accountLookup,
    replacement: { ...MARKET, transactionId: recorded.id },
    replaceTransaction: new ReplaceTransactionUseCase(
      transactionRepository,
      accountLookup,
    ),
  };
};

describe('ReplaceTransactionUseCase', () => {
  it('should replace every field of the transaction', async () => {
    // Arrange
    const { replacement, replaceTransaction } = await setUp();

    // Act
    const transaction = await replaceTransaction.execute({
      ...replacement,
      accountId: ANA_SAVINGS,
      date: '2026-11-21',
      amount: -5000,
      description: '  Supermarket  ',
    });

    // Assert
    expect(transaction).toEqual({
      id: replacement.transactionId,
      accountId: ANA_SAVINGS,
      date: '2026-11-21',
      amount: -5000,
      description: 'Supermarket',
    });
  });

  it('should save the replacement in the repository', async () => {
    // Arrange
    const { transactionRepository, replacement, replaceTransaction } =
      await setUp();

    // Act
    await replaceTransaction.execute({ ...replacement, amount: -5000 });

    // Assert
    expect(transactionRepository.transactions[0].amount).toBe(-5000);
    expect(transactionRepository.transactions[0].userId).toBe(ANA);
  });

  it('should move a transaction off an archived account to an active one', async () => {
    // Arrange
    const { accountLookup, replacement, replaceTransaction } = await setUp();
    accountLookup.accounts[0].isArchived = true;

    // Act
    const transaction = await replaceTransaction.execute({
      ...replacement,
      accountId: ANA_SAVINGS,
    });

    // Assert
    expect(transaction.accountId).toBe(ANA_SAVINGS);
  });

  it('should reject moving the transaction to an archived account', async () => {
    // Arrange
    const { transactionRepository, replacement, replaceTransaction } =
      await setUp();

    // Act
    const replace = replaceTransaction.execute({
      ...replacement,
      accountId: ARCHIVED_ACCOUNT,
    });

    // Assert
    await expect(replace).rejects.toThrow(TransactionAccountArchivedError);
    expect(transactionRepository.transactions[0].accountId).toBe(ANA_ACCOUNT);
  });

  it("should reject moving the transaction to another user's account", async () => {
    // Arrange
    const { replacement, replaceTransaction } = await setUp();

    // Act
    const replace = replaceTransaction.execute({
      ...replacement,
      accountId: BRUNO_ACCOUNT,
    });

    // Assert
    await expect(replace).rejects.toThrow(TransactionAccountNotFoundError);
  });

  it("should not replace another user's transaction", async () => {
    // Arrange
    const { transactionRepository, replacement, replaceTransaction } =
      await setUp();

    // Act
    const replace = replaceTransaction.execute({
      ...replacement,
      userId: BRUNO,
      accountId: BRUNO_ACCOUNT,
      amount: -1,
    });

    // Assert
    await expect(replace).rejects.toThrow(TransactionNotFoundError);
    expect(transactionRepository.transactions[0].amount).toBe(-4590);
  });

  it('should reject an unknown transaction', async () => {
    // Arrange
    const { replacement, replaceTransaction } = await setUp();

    // Act
    const replace = replaceTransaction.execute({
      ...replacement,
      transactionId: 'transaction-unknown',
    });

    // Assert
    await expect(replace).rejects.toThrow(TransactionNotFoundError);
  });

  it.each([
    [{ amount: 0 }, InvalidTransactionAmountError],
    [{ date: '2026-02-30' }, InvalidTransactionDateError],
    [{ description: '   ' }, InvalidTransactionDescriptionError],
  ])('should reject the invalid field %o', async (invalidField, error) => {
    // Arrange
    const { replacement, replaceTransaction } = await setUp();

    // Act
    const replace = replaceTransaction.execute({
      ...replacement,
      ...invalidField,
    });

    // Assert
    await expect(replace).rejects.toThrow(error);
  });
});
