import {
  AccountNameAlreadyUsedError,
  AccountNotFoundError,
  InvalidAccountTypeError,
} from '../domain/accounts.errors.js';
import { CreateAccountUseCase } from './create-account.use-case.js';
import { InMemoryAccountRepository } from './testing/account-repository.fake.js';
import { UpdateAccountUseCase } from './update-account.use-case.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const setUp = async () => {
  const accountRepository = new InMemoryAccountRepository();
  const createAccount = new CreateAccountUseCase(accountRepository);
  const account = await createAccount.execute({
    userId: ANA,
    name: 'Nubank card',
    type: 'credit_card',
    openingBalance: -150000,
  });
  return {
    createAccount,
    account,
    updateAccount: new UpdateAccountUseCase(accountRepository),
  };
};

describe('UpdateAccountUseCase', () => {
  it('should rename the account', async () => {
    // Arrange
    const { account, updateAccount } = await setUp();

    // Act
    const updated = await updateAccount.execute({
      userId: ANA,
      accountId: account.id,
      name: 'Itaú checking',
    });

    // Assert
    expect(updated.name).toBe('Itaú checking');
  });

  it('should keep the fields that were not sent', async () => {
    // Arrange
    const { account, updateAccount } = await setUp();

    // Act
    const updated = await updateAccount.execute({
      userId: ANA,
      accountId: account.id,
      openingBalance: 0,
    });

    // Assert
    expect(updated).toEqual({ ...account, openingBalance: 0, balance: 0 });
  });

  it('should reject a field that breaks the create rules', async () => {
    // Arrange
    const { account, updateAccount } = await setUp();

    // Act
    const update = updateAccount.execute({
      userId: ANA,
      accountId: account.id,
      type: 'loan',
    });

    // Assert
    await expect(update).rejects.toThrow(InvalidAccountTypeError);
  });

  it("should reject a name already used by another of the user's accounts", async () => {
    // Arrange
    const { account, createAccount, updateAccount } = await setUp();
    await createAccount.execute({
      userId: ANA,
      name: 'Inter',
      type: 'checking',
      openingBalance: 0,
    });

    // Act
    const update = updateAccount.execute({
      userId: ANA,
      accountId: account.id,
      name: 'inter',
    });

    // Assert
    await expect(update).rejects.toThrow(AccountNameAlreadyUsedError);
  });

  it('should allow changing only the casing of its own name', async () => {
    // Arrange
    const { account, updateAccount } = await setUp();

    // Act
    const updated = await updateAccount.execute({
      userId: ANA,
      accountId: account.id,
      name: 'NUBANK CARD',
    });

    // Assert
    expect(updated.name).toBe('NUBANK CARD');
  });

  it("should not edit another user's account", async () => {
    // Arrange
    const { account, updateAccount } = await setUp();

    // Act
    const update = updateAccount.execute({
      userId: BRUNO,
      accountId: account.id,
      name: 'Mine now',
    });

    // Assert
    await expect(update).rejects.toThrow(AccountNotFoundError);
  });
});
