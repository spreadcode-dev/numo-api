import { ConflictException, NotFoundException } from '@nestjs/common';
import type { DeleteTransferUseCase } from '../application/delete-transfer.use-case.js';
import type { TransferBetweenAccountsUseCase } from '../application/transfer-between-accounts.use-case.js';
import {
  TransactionAccountArchivedError,
  TransferNotFoundError,
} from '../domain/transactions.errors.js';
import { TransfersController } from './transfers.controller.js';

const USER = { id: '6f1c1a9e-0000-4000-8000-000000000001' };
const TRANSFER_ID = '7e8f9a0b-0000-4000-8000-000000000001';

const REQUEST = {
  fromAccountId: '9a2b3c4d-0000-4000-8000-000000000001',
  toAccountId: '9a2b3c4d-0000-4000-8000-000000000002',
  amount: 50000,
  date: '2026-11-20',
  description: 'Card bill',
};

const leg = (accountId: string, amount: number) => ({
  id: `1d2e3f4a-0000-4000-8000-00000000000${amount < 0 ? 1 : 2}`,
  accountId,
  date: REQUEST.date,
  amount,
  description: REQUEST.description,
  labels: [],
  transferId: TRANSFER_ID,
});

const TRANSFER = {
  transferId: TRANSFER_ID,
  outgoing: leg(REQUEST.fromAccountId, -50000),
  incoming: leg(REQUEST.toAccountId, 50000),
};

type UseCaseFakes = {
  transferBetweenAccounts?: TransferBetweenAccountsUseCase['execute'];
  deleteTransfer?: DeleteTransferUseCase['execute'];
};

const controllerWith = (fakes: UseCaseFakes) =>
  new TransfersController(
    {
      execute: fakes.transferBetweenAccounts ?? vi.fn(),
    } as TransferBetweenAccountsUseCase,
    { execute: fakes.deleteTransfer ?? vi.fn() } as DeleteTransferUseCase,
  );

describe('TransfersController', () => {
  it('should create the transfer for the user in the token', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(TRANSFER);
    const controller = controllerWith({ transferBetweenAccounts: execute });

    // Act
    const response = await controller.create(USER, REQUEST);

    // Assert
    expect(response).toEqual(TRANSFER);
    expect(execute).toHaveBeenCalledWith({ ...REQUEST, userId: USER.id });
  });

  it('should answer 409 when an account is archived', async () => {
    // Arrange
    const execute = vi
      .fn()
      .mockRejectedValue(new TransactionAccountArchivedError());
    const controller = controllerWith({ transferBetweenAccounts: execute });

    // Act
    const create = controller.create(USER, REQUEST);

    // Assert
    await expect(create).rejects.toBeInstanceOf(ConflictException);
  });

  it("should delete the token user's transfer", async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(undefined);
    const controller = controllerWith({ deleteTransfer: execute });

    // Act
    await controller.delete(USER, TRANSFER_ID);

    // Assert
    expect(execute).toHaveBeenCalledWith({
      userId: USER.id,
      transferId: TRANSFER_ID,
    });
  });

  it('should answer 404 when the transfer is not found', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new TransferNotFoundError());
    const controller = controllerWith({ deleteTransfer: execute });

    // Act
    const remove = controller.delete(USER, TRANSFER_ID);

    // Assert
    await expect(remove).rejects.toBeInstanceOf(NotFoundException);
  });
});
