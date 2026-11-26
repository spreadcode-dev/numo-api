import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL } from '@shared/database/database.tokens.js';
import type { Pool } from 'pg';
import type {
  TransactionPageQuery,
  TransactionReader,
} from '../application/transaction-reader.js';
import { toTransactionAmount } from '../domain/transaction-amount.js';
import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import type {
  NewTransaction,
  TransactionRepository,
} from '../domain/transaction-repository.js';
import type { Transaction } from '../domain/transaction.js';

type TransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  date: string;
  amount: string;
  description: string;
  created_at: Date;
  updated_at: Date;
};

// date::text keeps the calendar day as YYYY-MM-DD; pg would otherwise parse a
// DATE into a local-midnight Date and could shift the day.
const TRANSACTION_COLUMNS =
  'id, user_id, account_id, date::text AS date, amount, description, created_at, updated_at';

// pg returns BIGINT as a string; toTransactionAmount rejects values beyond
// Number.MAX_SAFE_INTEGER instead of letting Number() round them silently.
const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  userId: row.user_id,
  accountId: row.account_id,
  date: TransactionDate.create(row.date),
  amount: toTransactionAmount(Number(row.amount)),
  description: TransactionDescription.create(row.description),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

type Filter = {
  condition: (...placeholders: string[]) => string;
  values: unknown[];
};

// Only the filters actually sent become SQL, so the planner always sees plain
// conditions it can match against the (user_id, date DESC, id DESC) index.
const filtersFor = (query: TransactionPageQuery): Filter[] => {
  const filters: Filter[] = [
    { condition: (userId) => `user_id = ${userId}`, values: [query.userId] },
  ];
  if (query.accountId !== undefined) {
    filters.push({
      condition: (accountId) => `account_id = ${accountId}`,
      values: [query.accountId],
    });
  }
  if (query.from) {
    filters.push({
      condition: (from) => `date >= ${from}::date`,
      values: [query.from.value],
    });
  }
  if (query.to) {
    filters.push({
      condition: (to) => `date <= ${to}::date`,
      values: [query.to.value],
    });
  }
  if (query.after) {
    filters.push({
      condition: (date, id) => `(date, id) < (${date}::date, ${id}::uuid)`,
      values: [query.after.date.value, query.after.id],
    });
  }
  return filters;
};

// Numbers the placeholders ($1, $2, ...) in the order the values are pushed.
const toWhereClause = (filters: Filter[]) => {
  const params: unknown[] = [];
  const conditions = filters.map((filter) => {
    const placeholders = filter.values.map((value) => {
      params.push(value);
      return `$${params.length}`;
    });
    return filter.condition(...placeholders);
  });
  return { sql: conditions.join(' AND '), params };
};

@Injectable()
export class PgTransactionRepository
  implements TransactionRepository, TransactionReader
{
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  async create(newTransaction: NewTransaction): Promise<Transaction> {
    const result = await this.pool.query<TransactionRow>(
      `INSERT INTO transactions (user_id, account_id, date, amount, description)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING ${TRANSACTION_COLUMNS}`,
      [
        newTransaction.userId,
        newTransaction.accountId,
        newTransaction.date.value,
        newTransaction.amount,
        newTransaction.description.value,
      ],
    );
    return toTransaction(result.rows[0]);
  }

  async findById(
    userId: string,
    transactionId: string,
  ): Promise<Transaction | undefined> {
    const result = await this.pool.query<TransactionRow>(
      `SELECT ${TRANSACTION_COLUMNS} FROM transactions
        WHERE id = $1 AND user_id = $2`,
      [transactionId, userId],
    );

    return result.rows.map(toTransaction).at(0);
  }

  async update(transaction: Transaction): Promise<Transaction> {
    const result = await this.pool.query<TransactionRow>(
      `UPDATE transactions
          SET account_id = $3, date = $4, amount = $5, description = $6,
              updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING ${TRANSACTION_COLUMNS}`,
      [
        transaction.id,
        transaction.userId,
        transaction.accountId,
        transaction.date.value,
        transaction.amount,
        transaction.description.value,
      ],
    );
    return toTransaction(result.rows[0]);
  }

  async delete(userId: string, transactionId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [transactionId, userId],
    );
  }

  async listPage(query: TransactionPageQuery): Promise<Transaction[]> {
    const where = toWhereClause(filtersFor(query));
    const result = await this.pool.query<TransactionRow>(
      `SELECT ${TRANSACTION_COLUMNS} FROM transactions
        WHERE ${where.sql}
        ORDER BY date DESC, id DESC
        LIMIT $${where.params.length + 1}`,
      [...where.params, query.limit],
    );

    return result.rows.map(toTransaction);
  }
}
