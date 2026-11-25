import { CreateAccountUseCase } from './create-account.use-case.js';
import { ListAccountsUseCase } from './list-accounts.use-case.js';
import { InMemoryAccountRepository } from './testing/account-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const createUseCases = () => {
  const accountRepository = new InMemoryAccountRepository();
  return {
    accountRepository,
    createAccount: new CreateAccountUseCase(accountRepository),
    listAccounts: new ListAccountsUseCase(accountRepository),
  };
};

describe('ListAccountsUseCase', () => {
  it('should sort accounts by name, ignoring case and accents', async () => {
    // Arrange
    const { createAccount, listAccounts } = createUseCases();
    for (const name of ['Nubank card', 'itaú checking', 'Cash', 'Inter']) {
      await createAccount.execute({
        userId: ANA,
        name,
        type: 'checking',
        openingBalance: 0,
      });
    }

    // Act
    const accounts = await listAccounts.execute({
      userId: ANA,
      includeArchived: false,
    });

    // Assert
    expect(accounts.map((account) => account.name)).toEqual([
      'Cash',
      'Inter',
      'itaú checking',
      'Nubank card',
    ]);
  });

  it("should never return another user's accounts", async () => {
    // Arrange
    const { createAccount, listAccounts } = createUseCases();
    await createAccount.execute({
      userId: ANA,
      name: 'Nubank card',
      type: 'credit_card',
      openingBalance: -150000,
    });

    // Act
    const accounts = await listAccounts.execute({
      userId: BRUNO,
      includeArchived: false,
    });

    // Assert
    expect(accounts).toEqual([]);
  });

  it('should show each balance equal to its opening balance', async () => {
    // Arrange
    const { createAccount, listAccounts } = createUseCases();
    await createAccount.execute({
      userId: ANA,
      name: 'Wallet',
      type: 'cash',
      openingBalance: 25000,
    });

    // Act
    const [wallet] = await listAccounts.execute({
      userId: ANA,
      includeArchived: false,
    });

    // Assert
    expect(wallet.balance).toBe(25000);
  });

  it('should hide archived accounts by default', async () => {
    // Arrange
    const { accountRepository, createAccount, listAccounts } = createUseCases();
    const wallet = await createAccount.execute({
      userId: ANA,
      name: 'Wallet',
      type: 'cash',
      openingBalance: 0,
    });
    await accountRepository.archive(ANA, wallet.id);

    // Act
    const accounts = await listAccounts.execute({
      userId: ANA,
      includeArchived: false,
    });

    // Assert
    expect(accounts).toEqual([]);
  });

  it('should include archived accounts when asked', async () => {
    // Arrange
    const { accountRepository, createAccount, listAccounts } = createUseCases();
    const wallet = await createAccount.execute({
      userId: ANA,
      name: 'Wallet',
      type: 'cash',
      openingBalance: 0,
    });
    await accountRepository.archive(ANA, wallet.id);

    // Act
    const accounts = await listAccounts.execute({
      userId: ANA,
      includeArchived: true,
    });

    // Assert
    expect(accounts.map((account) => account.name)).toEqual(['Wallet']);
  });
});
