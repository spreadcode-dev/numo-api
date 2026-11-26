import {
  InvalidTransactionDateError,
  InvalidTransactionDescriptionError,
  InvalidTransferAmountError,
  SameTransferAccountError,
  TransactionAccountArchivedError,
  TransactionAccountNotFoundError,
} from '../domain/transactions.errors.js';
import { InMemoryAccountLookup } from './testing/account-lookup.fake.js';
import { InMemoryTransactionRepository } from './testing/transaction-repository.fake.js';
import { TransferBetweenAccountsUseCase } from './transfer-between-accounts.use-case.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';
const CHECKING = 'account-checking';
const CARD = 'account-card';
const ARCHIVED = 'account-archived';
const BRUNO_ACCOUNT = 'account-bruno';

const CARD_PAYMENT = {
  userId: ANA,
  fromAccountId: CHECKING,
  toAccountId: CARD,
  date: '2026-11-20',
  amount: 50000,
  description: 'Card bill',
};

const setUp = () => {
  const transactionRepository = new InMemoryTransactionRepository();
  const accountLookup = new InMemoryAccountLookup();
  accountLookup.accounts.push(
    { id: CHECKING, userId: ANA, isArchived: false },
    { id: CARD, userId: ANA, isArchived: false },
    { id: ARCHIVED, userId: ANA, isArchived: true },
    { id: BRUNO_ACCOUNT, userId: BRUNO, isArchived: false },
  );
  return {
    transactionRepository,
    transfer: new TransferBetweenAccountsUseCase(
      transactionRepository,
      accountLookup,
    ),
  };
};

describe('TransferBetweenAccountsUseCase', () => {
  it('should take the amount out of the source and put it into the destination', async () => {
    // Arrange
    const { transfer } = setUp();

    // Act
    const created = await transfer.execute(CARD_PAYMENT);

    // Assert
    expect(created.outgoing).toMatchObject({
      accountId: CHECKING,
      amount: -50000,
      date: '2026-11-20',
      description: 'Card bill',
      labels: [],
    });
    expect(created.incoming).toMatchObject({ accountId: CARD, amount: 50000 });
  });

  it('should give both legs the same transfer id', async () => {
    // Arrange
    const { transfer } = setUp();

    // Act
    const created = await transfer.execute(CARD_PAYMENT);

    // Assert
    expect(created.outgoing.transferId).toBe(created.transferId);
    expect(created.incoming.transferId).toBe(created.transferId);
  });

  it('should save both legs for the user', async () => {
    // Arrange
    const { transactionRepository, transfer } = setUp();

    // Act
    await transfer.execute(CARD_PAYMENT);

    // Assert
    expect(transactionRepository.transactions.map((leg) => leg.userId)).toEqual(
      [ANA, ANA],
    );
  });

  it('should reject the same account on both sides', async () => {
    // Arrange
    const { transfer } = setUp();

    // Act
    const create = transfer.execute({ ...CARD_PAYMENT, toAccountId: CHECKING });

    // Assert
    await expect(create).rejects.toThrow(SameTransferAccountError);
  });

  it.each([
    [{ amount: 0 }, InvalidTransferAmountError],
    [{ amount: -50000 }, InvalidTransferAmountError],
    [{ date: '2026-02-30' }, InvalidTransactionDateError],
    [{ description: '' }, InvalidTransactionDescriptionError],
  ])('should reject the invalid field %o', async (invalidField, error) => {
    // Arrange
    const { transactionRepository, transfer } = setUp();

    // Act
    const create = transfer.execute({ ...CARD_PAYMENT, ...invalidField });

    // Assert
    await expect(create).rejects.toThrow(error);
    expect(transactionRepository.transactions).toEqual([]);
  });

  it.each([
    ['source', { fromAccountId: BRUNO_ACCOUNT }],
    ['destination', { toAccountId: BRUNO_ACCOUNT }],
  ])(
    "should treat another user's %s account as not found",
    async (_side, account) => {
      // Arrange
      const { transactionRepository, transfer } = setUp();

      // Act
      const create = transfer.execute({ ...CARD_PAYMENT, ...account });

      // Assert
      await expect(create).rejects.toThrow(TransactionAccountNotFoundError);
      expect(transactionRepository.transactions).toEqual([]);
    },
  );

  it.each([
    ['source', { fromAccountId: ARCHIVED }],
    ['destination', { toAccountId: ARCHIVED }],
  ])('should reject an archived %s account', async (_side, account) => {
    // Arrange
    const { transfer } = setUp();

    // Act
    const create = transfer.execute({ ...CARD_PAYMENT, ...account });

    // Assert
    await expect(create).rejects.toThrow(TransactionAccountArchivedError);
  });
});
