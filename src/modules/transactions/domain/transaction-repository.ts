import type { Transaction } from './transaction.js';

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');

export type NewTransaction = Omit<
  Transaction,
  'id' | 'createdAt' | 'updatedAt'
>;

export interface TransactionRepository {
  create(newTransaction: NewTransaction): Promise<Transaction>;
}
