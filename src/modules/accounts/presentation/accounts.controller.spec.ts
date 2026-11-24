import { ConflictException } from '@nestjs/common';
import type { CreateAccountUseCase } from '../application/create-account.use-case.js';
import type { ListAccountsUseCase } from '../application/list-accounts.use-case.js';
import { AccountNameAlreadyUsedError } from '../domain/accounts.errors.js';
import { AccountsController } from './accounts.controller.js';

const USER = { id: '6f1c1a9e-0000-4000-8000-000000000001' };

const REQUEST = {
  name: 'Nubank card',
  type: 'credit_card',
  openingBalance: -150000,
};

const ACCOUNT = {
  id: '9a2b3c4d-0000-4000-8000-000000000001',
  name: 'Nubank card',
  type: 'credit_card' as const,
  currency: 'BRL' as const,
  openingBalance: -150000,
  balance: -150000,
};

type UseCaseFakes = {
  createAccount?: CreateAccountUseCase['execute'];
  listAccounts?: ListAccountsUseCase['execute'];
};

const controllerWith = (fakes: UseCaseFakes) =>
  new AccountsController(
    { execute: fakes.createAccount ?? vi.fn() } as CreateAccountUseCase,
    { execute: fakes.listAccounts ?? vi.fn() } as ListAccountsUseCase,
  );

describe('AccountsController', () => {
  it('should create the account for the user in the token', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(ACCOUNT);
    const controller = controllerWith({ createAccount: execute });

    // Act
    const response = await controller.create(USER, REQUEST);

    // Assert
    expect(response).toEqual(ACCOUNT);
    expect(execute).toHaveBeenCalledWith({ ...REQUEST, userId: USER.id });
  });

  it('should translate a domain error into an HTTP error', async () => {
    // Arrange
    const execute = vi
      .fn()
      .mockRejectedValue(new AccountNameAlreadyUsedError());
    const controller = controllerWith({ createAccount: execute });

    // Act
    const create = controller.create(USER, REQUEST);

    // Assert
    await expect(create).rejects.toBeInstanceOf(ConflictException);
  });

  it("should list the token user's accounts", async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue([ACCOUNT]);
    const controller = controllerWith({ listAccounts: execute });

    // Act
    const response = await controller.list(USER);

    // Assert
    expect(response).toEqual([ACCOUNT]);
    expect(execute).toHaveBeenCalledWith(USER.id);
  });
});
