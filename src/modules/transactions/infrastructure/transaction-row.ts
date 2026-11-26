import { toTransactionAmount } from '../domain/transaction-amount.js';
import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import type { Transaction } from '../domain/transaction.js';

export type TransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  date: string;
  amount: string;
  description: string;
  transfer_id: string | null;
  created_at: Date;
  updated_at: Date;
};

// date::text keeps the calendar day as YYYY-MM-DD; pg would otherwise parse a
// DATE into a local-midnight Date and could shift the day.
export const TRANSACTION_COLUMNS =
  'id, user_id, account_id, date::text AS date, amount, description, transfer_id, created_at, updated_at';

// pg returns BIGINT as a string; toTransactionAmount rejects values beyond
// Number.MAX_SAFE_INTEGER instead of letting Number() round them silently.
export const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  userId: row.user_id,
  accountId: row.account_id,
  date: TransactionDate.create(row.date),
  amount: toTransactionAmount(Number(row.amount)),
  description: TransactionDescription.create(row.description),
  transferId: row.transfer_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
