import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ArchiveAccountUseCase } from '../application/archive-account.use-case.js';
import type { CreateAccountUseCase } from '../application/create-account.use-case.js';
import type { ListAccountsUseCase } from '../application/list-accounts.use-case.js';
import type { UnarchiveAccountUseCase } from '../application/unarchive-account.use-case.js';
import type { UpdateAccountUseCase } from '../application/update-account.use-case.js';
import {
  AccountNameAlreadyUsedError,
  AccountNotFoundError,
} from '../domain/accounts.errors.js';
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

const REFERENCE = { userId: USER.id, accountId: ACCOUNT.id };

type UseCaseFakes = {
  createAccount?: CreateAccountUseCase['execute'];
  listAccounts?: ListAccountsUseCase['execute'];
  updateAccount?: UpdateAccountUseCase['execute'];
  archiveAccount?: ArchiveAccountUseCase['execute'];
  unarchiveAccount?: UnarchiveAccountUseCase['execute'];
};

const controllerWith = (fakes: UseCaseFakes) =>
  new AccountsController(
    { execute: fakes.createAccount ?? vi.fn() } as CreateAccountUseCase,
    { execute: fakes.listAccounts ?? vi.fn() } as ListAccountsUseCase,
    { execute: fakes.updateAccount ?? vi.fn() } as UpdateAccountUseCase,
    { execute: fakes.archiveAccount ?? vi.fn() } as ArchiveAccountUseCase,
    { execute: fakes.unarchiveAccount ?? vi.fn() } as UnarchiveAccountUseCase,
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

  it("should list only the token user's active accounts by default", async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue([ACCOUNT]);
    const controller = controllerWith({ listAccounts: execute });

    // Act
    const response = await controller.list(USER, {});

    // Assert
    expect(response).toEqual([ACCOUNT]);
    expect(execute).toHaveBeenCalledWith({
      userId: USER.id,
      includeArchived: false,
    });
  });

  it('should include archived accounts when the query asks for them', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue([ACCOUNT]);
    const controller = controllerWith({ listAccounts: execute });

    // Act
    await controller.list(USER, { includeArchived: 'true' });

    // Assert
    expect(execute).toHaveBeenCalledWith({
      userId: USER.id,
      includeArchived: true,
    });
  });

  it("should edit the token user's account with the fields sent", async () => {
    // Arrange
    const renamed = { ...ACCOUNT, name: 'Itaú checking' };
    const execute = vi.fn().mockResolvedValue(renamed);
    const controller = controllerWith({ updateAccount: execute });

    // Act
    const response = await controller.update(USER, ACCOUNT.id, {
      name: 'Itaú checking',
    });

    // Assert
    expect(response).toEqual(renamed);
    expect(execute).toHaveBeenCalledWith({
      ...REFERENCE,
      name: 'Itaú checking',
      type: undefined,
      openingBalance: undefined,
    });
  });

  it('should answer 404 when editing an account the user does not own', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new AccountNotFoundError());
    const controller = controllerWith({ updateAccount: execute });

    // Act
    const update = controller.update(USER, ACCOUNT.id, { name: 'Mine now' });

    // Assert
    await expect(update).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should archive the token user's account", async () => {
    // Arrange
    const archived = { ...ACCOUNT, archivedAt: new Date() };
    const execute = vi.fn().mockResolvedValue(archived);
    const controller = controllerWith({ archiveAccount: execute });

    // Act
    const response = await controller.archive(USER, ACCOUNT.id);

    // Assert
    expect(response).toEqual(archived);
    expect(execute).toHaveBeenCalledWith(REFERENCE);
  });

  it('should answer 404 when archiving an account the user does not own', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new AccountNotFoundError());
    const controller = controllerWith({ archiveAccount: execute });

    // Act
    const archive = controller.archive(USER, ACCOUNT.id);

    // Assert
    await expect(archive).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should unarchive the token user's account", async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(ACCOUNT);
    const controller = controllerWith({ unarchiveAccount: execute });

    // Act
    const response = await controller.unarchive(USER, ACCOUNT.id);

    // Assert
    expect(response).toEqual(ACCOUNT);
    expect(execute).toHaveBeenCalledWith(REFERENCE);
  });

  it('should answer 404 when unarchiving an account the user does not own', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new AccountNotFoundError());
    const controller = controllerWith({ unarchiveAccount: execute });

    // Act
    const unarchive = controller.unarchive(USER, ACCOUNT.id);

    // Assert
    await expect(unarchive).rejects.toBeInstanceOf(NotFoundException);
  });
});
