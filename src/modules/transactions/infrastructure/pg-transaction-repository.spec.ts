import type { Pool } from 'pg';
import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import { InvalidTransactionAmountError } from '../domain/transactions.errors.js';
import { PgTransactionRepository } from './pg-transaction-repository.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';
const ACCOUNT_ID = '9a2b3c4d-0000-4000-8000-000000000001';
const CREATED_AT = new Date('2026-11-26T12:00:00Z');

const TRANSACTION_ROW = {
  id: '1d2e3f4a-0000-4000-8000-000000000001',
  user_id: USER_ID,
  account_id: ACCOUNT_ID,
  date: '2026-11-20',
  amount: '-4590',
  description: 'Market',
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
};

const NEW_TRANSACTION = {
  userId: USER_ID,
  accountId: ACCOUNT_ID,
  date: TransactionDate.create('2026-11-20'),
  amount: -4590,
  description: TransactionDescription.create('Market'),
};

describe('PgTransactionRepository', () => {
  it('should return the inserted row as a transaction with cents as a number', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [TRANSACTION_ROW] });
    const repository = new PgTransactionRepository(poolWithQuery(query));

    // Act
    const transaction = await repository.create(NEW_TRANSACTION);

    // Assert
    expect(transaction).toEqual({
      id: TRANSACTION_ROW.id,
      ...NEW_TRANSACTION,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      USER_ID,
      ACCOUNT_ID,
      '2026-11-20',
      -4590,
      'Market',
    ]);
  });

  it('should read the date back as text so its day never shifts', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [TRANSACTION_ROW] });
    const repository = new PgTransactionRepository(poolWithQuery(query));

    // Act
    await repository.create(NEW_TRANSACTION);

    // Assert
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('date::text AS date'),
      expect.any(Array),
    );
  });

  it('should reject a stored amount too large for a JavaScript number', async () => {
    // Arrange
    const tooLarge = { ...TRANSACTION_ROW, amount: '9007199254740993' };
    const query = vi.fn().mockResolvedValue({ rows: [tooLarge] });
    const repository = new PgTransactionRepository(poolWithQuery(query));

    // Act
    const create = repository.create(NEW_TRANSACTION);

    // Assert
    await expect(create).rejects.toThrow(InvalidTransactionAmountError);
  });

  it("should list a page of the user's transactions, newest first", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [TRANSACTION_ROW] });
    const repository = new PgTransactionRepository(poolWithQuery(query));

    // Act
    const transactions = await repository.listPage({
      userId: USER_ID,
      limit: 51,
    });

    // Assert
    expect(transactions).toHaveLength(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('WHERE user_id = $1');
    expect(sql).toContain('ORDER BY date DESC, id DESC');
    expect(sql).toContain('LIMIT $2');
    expect(params).toEqual([USER_ID, 51]);
  });

  it('should add only the filters that were sent, in placeholder order', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgTransactionRepository(poolWithQuery(query));

    // Act
    await repository.listPage({
      userId: USER_ID,
      accountId: ACCOUNT_ID,
      from: TransactionDate.create('2026-11-01'),
      to: TransactionDate.create('2026-11-30'),
      after: {
        date: TransactionDate.create('2026-11-20'),
        id: TRANSACTION_ROW.id,
      },
      limit: 21,
    });

    // Assert
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain(
      'user_id = $1 AND account_id = $2 AND date >= $3::date AND date <= $4::date AND (date, id) < ($5::date, $6::uuid)',
    );
    expect(sql).toContain('LIMIT $7');
    expect(params).toEqual([
      USER_ID,
      ACCOUNT_ID,
      '2026-11-01',
      '2026-11-30',
      '2026-11-20',
      TRANSACTION_ROW.id,
      21,
    ]);
  });

  it('should page by position alone when only a cursor is sent', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgTransactionRepository(poolWithQuery(query));

    // Act
    await repository.listPage({
      userId: USER_ID,
      after: {
        date: TransactionDate.create('2026-11-20'),
        id: TRANSACTION_ROW.id,
      },
      limit: 51,
    });

    // Assert
    const [sql] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('user_id = $1 AND (date, id) < ($2::date, $3::uuid)');
  });

  it("should find the user's transaction by id", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [TRANSACTION_ROW] });
    const repository = new PgTransactionRepository(poolWithQuery(query));

    // Act
    const transaction = await repository.findById(USER_ID, TRANSACTION_ROW.id);

    // Assert
    expect(transaction?.id).toBe(TRANSACTION_ROW.id);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND user_id = $2'),
      [TRANSACTION_ROW.id, USER_ID],
    );
  });

  it('should return undefined when no transaction of the user has the id', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgTransactionRepository(poolWithQuery(query));

    // Act
    const transaction = await repository.findById(USER_ID, TRANSACTION_ROW.id);

    // Assert
    expect(transaction).toBeUndefined();
  });

  it("should update every editable field, scoped to the transaction's user", async () => {
    // Arrange
    const updatedRow = { ...TRANSACTION_ROW, amount: '-5000' };
    const query = vi.fn().mockResolvedValue({ rows: [updatedRow] });
    const repository = new PgTransactionRepository(poolWithQuery(query));

    // Act
    const transaction = await repository.update({
      id: TRANSACTION_ROW.id,
      ...NEW_TRANSACTION,
      amount: -5000,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });

    // Assert
    expect(transaction.amount).toBe(-5000);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND user_id = $2'),
      [TRANSACTION_ROW.id, USER_ID, ACCOUNT_ID, '2026-11-20', -5000, 'Market'],
    );
  });

  it("should delete only the user's transaction", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgTransactionRepository(poolWithQuery(query));

    // Act
    await repository.delete(USER_ID, TRANSACTION_ROW.id);

    // Assert
    expect(query).toHaveBeenCalledWith(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [TRANSACTION_ROW.id, USER_ID],
    );
  });
});
