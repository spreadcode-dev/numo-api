import { AccountName } from '../domain/account-name.js';
import { AccountNotFoundError } from '../domain/accounts.errors.js';
import { findOwnedAccount } from './find-owned-account.js';
import { InMemoryAccountRepository } from './testing/account-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const repositoryWithAnasAccount = async () => {
  const accountRepository = new InMemoryAccountRepository();
  const account = await accountRepository.create({
    userId: ANA,
    name: AccountName.create('Nubank card'),
    type: 'credit_card',
    currency: 'BRL',
    openingBalance: -150000,
  });
  return { accountRepository, account };
};

describe('findOwnedAccount', () => {
  it("should return the user's own account", async () => {
    // Arrange
    const { accountRepository, account } = await repositoryWithAnasAccount();

    // Act
    const found = await findOwnedAccount(accountRepository, {
      userId: ANA,
      accountId: account.id,
    });

    // Assert
    expect(found).toEqual(account);
  });

  it("should treat another user's account as not found", async () => {
    // Arrange
    const { accountRepository, account } = await repositoryWithAnasAccount();

    // Act
    const find = findOwnedAccount(accountRepository, {
      userId: BRUNO,
      accountId: account.id,
    });

    // Assert
    await expect(find).rejects.toThrow(AccountNotFoundError);
  });
});
