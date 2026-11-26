import {
  TransactionAccountArchivedError,
  TransactionAccountNotFoundError,
} from '../domain/transactions.errors.js';
import { ensureAccountAcceptsTransactions } from './ensure-account-accepts-transactions.js';
import { InMemoryAccountLookup } from './testing/account-lookup.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const setUp = () => {
  const accountLookup = new InMemoryAccountLookup();
  accountLookup.accounts.push(
    { id: 'account-ana', userId: ANA, isArchived: false },
    { id: 'account-ana-archived', userId: ANA, isArchived: true },
    { id: 'account-bruno', userId: BRUNO, isArchived: false },
  );
  return accountLookup;
};

describe('ensureAccountAcceptsTransactions', () => {
  it("should accept the user's active account", async () => {
    // Arrange
    const accountLookup = setUp();

    // Act
    const ensure = ensureAccountAcceptsTransactions(accountLookup, {
      userId: ANA,
      accountId: 'account-ana',
    });

    // Assert
    await expect(ensure).resolves.toBeUndefined();
  });

  it("should treat another user's account as not found", async () => {
    // Arrange
    const accountLookup = setUp();

    // Act
    const ensure = ensureAccountAcceptsTransactions(accountLookup, {
      userId: ANA,
      accountId: 'account-bruno',
    });

    // Assert
    await expect(ensure).rejects.toThrow(TransactionAccountNotFoundError);
  });

  it('should reject an archived account', async () => {
    // Arrange
    const accountLookup = setUp();

    // Act
    const ensure = ensureAccountAcceptsTransactions(accountLookup, {
      userId: ANA,
      accountId: 'account-ana-archived',
    });

    // Assert
    await expect(ensure).rejects.toThrow(TransactionAccountArchivedError);
  });
});
