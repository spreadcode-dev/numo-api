import type { Transaction } from './transaction.js';

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');

export type NewTransaction = Omit<
  Transaction,
  'id' | 'createdAt' | 'updatedAt'
>;

// Every method is scoped to one user: another user's transactions don't exist here.
export interface TransactionRepository {
  create(newTransaction: NewTransaction): Promise<Transaction>;
  findById(
    userId: string,
    transactionId: string,
  ): Promise<Transaction | undefined>;
  update(transaction: Transaction): Promise<Transaction>;
  delete(userId: string, transactionId: string): Promise<void>;
}
