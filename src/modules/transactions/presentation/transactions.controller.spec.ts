import { BadRequestException, ConflictException } from '@nestjs/common';
import type { ListTransactionsUseCase } from '../application/list-transactions.use-case.js';
import type { RecordTransactionUseCase } from '../application/record-transaction.use-case.js';
import {
  InvalidPageLimitError,
  TransactionAccountArchivedError,
} from '../domain/transactions.errors.js';
import { TransactionsController } from './transactions.controller.js';

const USER = { id: '6f1c1a9e-0000-4000-8000-000000000001' };

const REQUEST = {
  accountId: '9a2b3c4d-0000-4000-8000-000000000001',
  date: '2026-11-20',
  amount: -4590,
  description: 'Market',
};

const TRANSACTION = { id: '1d2e3f4a-0000-4000-8000-000000000001', ...REQUEST };

type UseCaseFakes = {
  recordTransaction?: RecordTransactionUseCase['execute'];
  listTransactions?: ListTransactionsUseCase['execute'];
};

const controllerWith = (fakes: UseCaseFakes) =>
  new TransactionsController(
    { execute: fakes.recordTransaction ?? vi.fn() } as RecordTransactionUseCase,
    { execute: fakes.listTransactions ?? vi.fn() } as ListTransactionsUseCase,
  );

describe('TransactionsController', () => {
  it('should record the transaction for the user in the token', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(TRANSACTION);
    const controller = controllerWith({ recordTransaction: execute });

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
    const controller = controllerWith({ recordTransaction: execute });

    // Act
    const record = controller.record(USER, REQUEST);

    // Assert
    await expect(record).rejects.toBeInstanceOf(ConflictException);
  });

  it("should list the token user's transactions with the query as typed values", async () => {
    // Arrange
    const page = { items: [TRANSACTION], nextCursor: 'next' };
    const execute = vi.fn().mockResolvedValue(page);
    const controller = controllerWith({ listTransactions: execute });

    // Act
    const response = await controller.list(USER, {
      accountId: REQUEST.accountId,
      from: '2026-11-01',
      to: '2026-11-30',
      limit: '20',
      cursor: 'previous',
    });

    // Assert
    expect(response).toEqual(page);
    expect(execute).toHaveBeenCalledWith({
      userId: USER.id,
      accountId: REQUEST.accountId,
      from: '2026-11-01',
      to: '2026-11-30',
      limit: 20,
      cursor: 'previous',
    });
  });

  it('should leave the limit to its default when none is sent', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue({ items: [] });
    const controller = controllerWith({ listTransactions: execute });

    // Act
    await controller.list(USER, {});

    // Assert
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ limit: undefined }),
    );
  });

  it('should answer 400 when the use case rejects the limit', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new InvalidPageLimitError());
    const controller = controllerWith({ listTransactions: execute });

    // Act
    const list = controller.list(USER, { limit: '101' });

    // Assert
    await expect(list).rejects.toBeInstanceOf(BadRequestException);
  });
});
