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
});
