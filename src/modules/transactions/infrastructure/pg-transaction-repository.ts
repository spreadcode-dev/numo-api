import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL } from '@shared/database/database.tokens.js';
import type { Pool } from 'pg';
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

@Injectable()
export class PgTransactionRepository implements TransactionRepository {
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
}
