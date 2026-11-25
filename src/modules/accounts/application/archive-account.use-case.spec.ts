import { AccountName } from '../domain/account-name.js';
import { AccountNotFoundError } from '../domain/accounts.errors.js';
import { ArchiveAccountUseCase } from './archive-account.use-case.js';
import { InMemoryAccountRepository } from './testing/account-repository.fake.js';

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
    archiveAccount: new ArchiveAccountUseCase(accountRepository),
  };
};

describe('ArchiveAccountUseCase', () => {
  it('should set the archive date', async () => {
    // Arrange
    const { reference, archiveAccount } = await setUp();

    // Act
    const archived = await archiveAccount.execute(reference);

    // Assert
    expect(archived.archivedAt).toBeInstanceOf(Date);
  });

  it('should keep the first archive date when archived again', async () => {
    // Arrange
    const { accountRepository, reference, archiveAccount } = await setUp();
    const first = await archiveAccount.execute(reference);
    const archive = vi.spyOn(accountRepository, 'archive');

    // Act
    const second = await archiveAccount.execute(reference);

    // Assert
    expect(second.archivedAt).toBe(first.archivedAt);
    expect(archive).not.toHaveBeenCalled();
  });

  it("should not archive another user's account", async () => {
    // Arrange
    const { reference, archiveAccount } = await setUp();

    // Act
    const archive = archiveAccount.execute({ ...reference, userId: BRUNO });

    // Assert
    await expect(archive).rejects.toThrow(AccountNotFoundError);
  });
});
