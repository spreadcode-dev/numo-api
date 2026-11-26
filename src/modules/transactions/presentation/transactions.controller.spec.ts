import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DeleteTransactionUseCase } from '../application/delete-transaction.use-case.js';
import type { ListTransactionsUseCase } from '../application/list-transactions.use-case.js';
import type { RecordTransactionUseCase } from '../application/record-transaction.use-case.js';
import type { ReplaceTransactionUseCase } from '../application/replace-transaction.use-case.js';
import {
  InvalidPageLimitError,
  TransactionAccountArchivedError,
  TransactionNotFoundError,
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
  replaceTransaction?: ReplaceTransactionUseCase['execute'];
  deleteTransaction?: DeleteTransactionUseCase['execute'];
};

const controllerWith = (fakes: UseCaseFakes) =>
  new TransactionsController(
    { execute: fakes.recordTransaction ?? vi.fn() } as RecordTransactionUseCase,
    { execute: fakes.listTransactions ?? vi.fn() } as ListTransactionsUseCase,
    {
      execute: fakes.replaceTransaction ?? vi.fn(),
    } as ReplaceTransactionUseCase,
    {
      execute: fakes.deleteTransaction ?? vi.fn(),
    } as DeleteTransactionUseCase,
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

  it("should replace the token user's transaction with the full body", async () => {
    // Arrange
    const replaced = { ...TRANSACTION, amount: -5000 };
    const execute = vi.fn().mockResolvedValue(replaced);
    const controller = controllerWith({ replaceTransaction: execute });

    // Act
    const response = await controller.replace(USER, TRANSACTION.id, {
      ...REQUEST,
      amount: -5000,
    });

    // Assert
    expect(response).toEqual(replaced);
    expect(execute).toHaveBeenCalledWith({
      ...REQUEST,
      amount: -5000,
      userId: USER.id,
      transactionId: TRANSACTION.id,
    });
  });

  it('should answer 404 when the transaction to replace is not found', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new TransactionNotFoundError());
    const controller = controllerWith({ replaceTransaction: execute });

    // Act
    const replace = controller.replace(USER, TRANSACTION.id, REQUEST);

    // Assert
    await expect(replace).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should delete the token user's transaction", async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(undefined);
    const controller = controllerWith({ deleteTransaction: execute });

    // Act
    await controller.delete(USER, TRANSACTION.id);

    // Assert
    expect(execute).toHaveBeenCalledWith({
      userId: USER.id,
      transactionId: TRANSACTION.id,
    });
  });

  it('should answer 404 when the transaction to delete is not found', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new TransactionNotFoundError());
    const controller = controllerWith({ deleteTransaction: execute });

    // Act
    const remove = controller.delete(USER, TRANSACTION.id);

    // Assert
    await expect(remove).rejects.toBeInstanceOf(NotFoundException);
  });
});
