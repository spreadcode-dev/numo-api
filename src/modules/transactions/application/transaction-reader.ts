import type { TransactionDate } from '../domain/transaction-date.js';
import type { Transaction } from '../domain/transaction.js';

export const TRANSACTION_READER = Symbol('TRANSACTION_READER');

// Where the previous page ended, in the list's order (date, then id, newest first).
export type PagePosition = {
  date: TransactionDate;
  id: string;
};

export type TransactionPageQuery = {
  userId: string;
  accountId?: string;
  from?: TransactionDate;
  to?: TransactionDate;
  after?: PagePosition;
  limit: number;
};

// Read side of transactions: newest first, every filter combined with AND,
// and always scoped to the user.
export interface TransactionReader {
  listPage(query: TransactionPageQuery): Promise<Transaction[]>;
}
