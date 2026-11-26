import {
  InvalidTransactionAmountError,
  InvalidTransactionDateError,
  InvalidTransactionDescriptionError,
  TransactionAccountArchivedError,
  TransactionAccountNotFoundError,
} from '../domain/transactions.errors.js';
import { RecordTransactionUseCase } from './record-transaction.use-case.js';
import { InMemoryAccountLookup } from './testing/account-lookup.fake.js';
import { InMemoryTransactionRepository } from './testing/transaction-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';
const ANA_ACCOUNT = 'account-ana';
const ARCHIVED_ACCOUNT = 'account-ana-archived';
const BRUNO_ACCOUNT = 'account-bruno';

const MARKET = {
  userId: ANA,
  accountId: ANA_ACCOUNT,
  date: '2026-11-20',
  amount: -4590,
  description: 'Market',
};

const setUp = () => {
  const transactionRepository = new InMemoryTransactionRepository();
  const accountLookup = new InMemoryAccountLookup();
  accountLookup.accounts.push(
    { id: ANA_ACCOUNT, userId: ANA, isArchived: false },
    { id: ARCHIVED_ACCOUNT, userId: ANA, isArchived: true },
    { id: BRUNO_ACCOUNT, userId: BRUNO, isArchived: false },
  );
  return {
    transactionRepository,
    recordTransaction: new RecordTransactionUseCase(
      transactionRepository,
      accountLookup,
    ),
  };
};

describe('RecordTransactionUseCase', () => {
  it("should record an expense on the user's account", async () => {
    // Arrange
    const { transactionRepository, recordTransaction } = setUp();

    // Act
    const transaction = await recordTransaction.execute(MARKET);

    // Assert
    expect(transaction).toEqual({
      id: expect.any(String),
      accountId: ANA_ACCOUNT,
      date: '2026-11-20',
      amount: -4590,
      description: 'Market',
      labels: [],
    });
    expect(transactionRepository.transactions[0].userId).toBe(ANA);
  });

  it('should record an income as a positive amount', async () => {
    // Arrange
    const { recordTransaction } = setUp();

    // Act
    const transaction = await recordTransaction.execute({
      ...MARKET,
      amount: 500000,
      description: 'Salary',
    });

    // Assert
    expect(transaction.amount).toBe(500000);
  });

  it('should trim the description', async () => {
    // Arrange
    const { recordTransaction } = setUp();

    // Act
    const transaction = await recordTransaction.execute({
      ...MARKET,
      description: '  Market  ',
    });

    // Assert
    expect(transaction.description).toBe('Market');
  });

  it.each([
    [{ amount: 0 }, InvalidTransactionAmountError],
    [{ amount: 45.9 }, InvalidTransactionAmountError],
    [{ date: '2026-02-30' }, InvalidTransactionDateError],
    [{ description: '' }, InvalidTransactionDescriptionError],
    [{ description: 'a'.repeat(141) }, InvalidTransactionDescriptionError],
  ])('should reject %j without saving it', async (change, expectedError) => {
    // Arrange
    const { transactionRepository, recordTransaction } = setUp();

    // Act
    const record = recordTransaction.execute({ ...MARKET, ...change });

    // Assert
    await expect(record).rejects.toThrow(expectedError);
    expect(transactionRepository.transactions).toEqual([]);
  });

  it("should not record on another user's account", async () => {
    // Arrange
    const { transactionRepository, recordTransaction } = setUp();

    // Act
    const record = recordTransaction.execute({
      ...MARKET,
      accountId: BRUNO_ACCOUNT,
    });

    // Assert
    await expect(record).rejects.toThrow(TransactionAccountNotFoundError);
    expect(transactionRepository.transactions).toEqual([]);
  });

  it('should not record on an unknown account', async () => {
    // Arrange
    const { recordTransaction } = setUp();

    // Act
    const record = recordTransaction.execute({
      ...MARKET,
      accountId: 'account-unknown',
    });

    // Assert
    await expect(record).rejects.toThrow(TransactionAccountNotFoundError);
  });

  it('should not record on an archived account', async () => {
    // Arrange
    const { transactionRepository, recordTransaction } = setUp();

    // Act
    const record = recordTransaction.execute({
      ...MARKET,
      accountId: ARCHIVED_ACCOUNT,
    });

    // Assert
    await expect(record).rejects.toThrow(TransactionAccountArchivedError);
    expect(transactionRepository.transactions).toEqual([]);
  });
});
