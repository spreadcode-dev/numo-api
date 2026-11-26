import type {
  NewTransaction,
  TransactionRepository,
} from '../../domain/transaction-repository.js';
import type { Transaction } from '../../domain/transaction.js';

export class InMemoryTransactionRepository implements TransactionRepository {
  readonly transactions: Transaction[] = [];

  create(newTransaction: NewTransaction): Promise<Transaction> {
    const now = new Date();
    const transaction: Transaction = {
      id: `transaction-${this.transactions.length + 1}`,
      ...newTransaction,
      createdAt: now,
      updatedAt: now,
    };
    this.transactions.push(transaction);
    return Promise.resolve(transaction);
  }
}
