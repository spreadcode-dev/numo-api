import {
  AccountNameAlreadyUsedError,
  InvalidAccountNameError,
  InvalidAccountTypeError,
  InvalidAmountError,
  UnsupportedCurrencyError,
} from '../domain/accounts.errors.js';
import {
  type CreateAccountCommand,
  CreateAccountUseCase,
} from './create-account.use-case.js';
import { InMemoryAccountRepository } from './testing/account-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const NUBANK_CARD: CreateAccountCommand = {
  userId: ANA,
  name: 'Nubank card',
  type: 'credit_card',
  openingBalance: -150000,
};

const createUseCase = () => {
  const accountRepository = new InMemoryAccountRepository();
  const useCase = new CreateAccountUseCase(accountRepository);
  return { useCase, accountRepository };
};

describe('CreateAccountUseCase', () => {
  it('should return the new account in BRL with the balance equal to the opening balance', async () => {
    // Arrange
    const { useCase } = createUseCase();

    // Act
    const account = await useCase.execute(NUBANK_CARD);

    // Assert
    expect(account).toEqual({
      id: 'account-1',
      name: 'Nubank card',
      type: 'credit_card',
      currency: 'BRL',
      openingBalance: -150000,
      balance: -150000,
      archivedAt: undefined,
    });
  });

  it('should save the account under the calling user', async () => {
    // Arrange
    const { useCase, accountRepository } = createUseCase();

    // Act
    await useCase.execute(NUBANK_CARD);

    // Assert
    expect(accountRepository.accounts[0].userId).toBe(ANA);
  });

  it('should reject a name the user already has, whatever its casing', async () => {
    // Arrange
    const { useCase } = createUseCase();
    await useCase.execute(NUBANK_CARD);

    // Act
    const create = useCase.execute({ ...NUBANK_CARD, name: 'NUBANK CARD' });

    // Assert
    await expect(create).rejects.toThrow(AccountNameAlreadyUsedError);
  });

  it('should let another user use the same name', async () => {
    // Arrange
    const { useCase } = createUseCase();
    await useCase.execute(NUBANK_CARD);

    // Act
    const account = await useCase.execute({ ...NUBANK_CARD, userId: BRUNO });

    // Assert
    expect(account.name).toBe('Nubank card');
  });

  it.each([
    ['an empty name', { name: '  ' }, InvalidAccountNameError],
    ['an unknown type', { type: 'loan' }, InvalidAccountTypeError],
    ['a fractional amount', { openingBalance: 10.5 }, InvalidAmountError],
    [
      'a currency other than BRL',
      { currency: 'USD' },
      UnsupportedCurrencyError,
    ],
  ])('should store nothing for %s', async (_case, change, expectedError) => {
    // Arrange
    const { useCase, accountRepository } = createUseCase();

    // Act
    const create = useCase.execute({ ...NUBANK_CARD, ...change });

    // Assert
    await expect(create).rejects.toThrow(expectedError);
    expect(accountRepository.accounts).toHaveLength(0);
  });
});
