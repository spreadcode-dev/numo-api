import { AccountName } from '../domain/account-name.js';
import { AccountNotFoundError } from '../domain/accounts.errors.js';
import { InMemoryAccountRepository } from './testing/account-repository.fake.js';
import { UnarchiveAccountUseCase } from './unarchive-account.use-case.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const setUp = async () => {
  const accountRepository = new InMemoryAccountRepository();
  const account = await accountRepository.create({
    userId: ANA,
    name: AccountName.create('Nubank card'),
    type: 'credit_card',
    currency: 'BRL',
    openingBalance: -150000,
  });
  return {
    accountRepository,
    reference: { userId: ANA, accountId: account.id },
    unarchiveAccount: new UnarchiveAccountUseCase(accountRepository),
  };
};

describe('UnarchiveAccountUseCase', () => {
  it('should clear the archive date', async () => {
    // Arrange
    const { accountRepository, reference, unarchiveAccount } = await setUp();
    await accountRepository.archive(reference.userId, reference.accountId);

    // Act
    const unarchived = await unarchiveAccount.execute(reference);

    // Assert
    expect(unarchived.archivedAt).toBeUndefined();
  });

  it('should leave an active account untouched', async () => {
    // Arrange
    const { accountRepository, reference, unarchiveAccount } = await setUp();
    const unarchive = vi.spyOn(accountRepository, 'unarchive');

    // Act
    const account = await unarchiveAccount.execute(reference);

    // Assert
    expect(account.archivedAt).toBeUndefined();
    expect(unarchive).not.toHaveBeenCalled();
  });

  it("should not unarchive another user's account", async () => {
    // Arrange
    const { reference, unarchiveAccount } = await setUp();

    // Act
    const unarchive = unarchiveAccount.execute({ ...reference, userId: BRUNO });

    // Assert
    await expect(unarchive).rejects.toThrow(AccountNotFoundError);
  });
});
