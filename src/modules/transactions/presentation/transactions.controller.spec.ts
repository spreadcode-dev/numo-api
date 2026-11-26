import { ConflictException } from '@nestjs/common';
import type { RecordTransactionUseCase } from '../application/record-transaction.use-case.js';
import { TransactionAccountArchivedError } from '../domain/transactions.errors.js';
import { TransactionsController } from './transactions.controller.js';

const USER = { id: '6f1c1a9e-0000-4000-8000-000000000001' };

const REQUEST = {
  accountId: '9a2b3c4d-0000-4000-8000-000000000001',
  date: '2026-11-20',
  amount: -4590,
  description: 'Market',
};

const TRANSACTION = { id: '1d2e3f4a-0000-4000-8000-000000000001', ...REQUEST };

const controllerWith = (execute: RecordTransactionUseCase['execute']) =>
  new TransactionsController({ execute } as RecordTransactionUseCase);

describe('TransactionsController', () => {
  it('should record the transaction for the user in the token', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(TRANSACTION);
    const controller = controllerWith(execute);

    // Act
    const response = await controller.record(USER, REQUEST);

    // Assert
    expect(response).toEqual(TRANSACTION);
    expect(execute).toHaveBeenCalledWith({ ...REQUEST, userId: USER.id });
  });

  it('should translate a domain error into an HTTP error', async () => {
    // Arrange
    const execute = vi
      .fn()
      .mockRejectedValue(new TransactionAccountArchivedError());
    const controller = controllerWith(execute);

    // Act
    const record = controller.record(USER, REQUEST);

    // Assert
    await expect(record).rejects.toBeInstanceOf(ConflictException);
  });
});
