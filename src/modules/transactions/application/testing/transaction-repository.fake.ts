import type {
  NewTransaction,
  TransactionRepository,
} from '../../domain/transaction-repository.js';
import type { Transaction } from '../../domain/transaction.js';
import type {
  PagePosition,
  TransactionPageQuery,
  TransactionReader,
} from '../transaction-reader.js';

// Same order as the SQL: date, then id, newest first.
const newestFirst = (left: PagePosition, right: PagePosition): number =>
  right.date.value.localeCompare(left.date.value) ||
  (right.id < left.id ? -1 : right.id > left.id ? 1 : 0);

// UUID-shaped like the real ids, so page cursors built from them decode.
const fakeId = (sequence: number): string =>
  `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;

const matches = (
  transaction: Transaction,
  query: TransactionPageQuery,
): boolean =>
  transaction.userId === query.userId &&
  (query.accountId === undefined ||
    transaction.accountId === query.accountId) &&
  (query.from === undefined || transaction.date.value >= query.from.value) &&
  (query.to === undefined || transaction.date.value <= query.to.value) &&
  (query.after === undefined || newestFirst(query.after, transaction) < 0);

export class InMemoryTransactionRepository
  implements TransactionRepository, TransactionReader
{
  readonly transactions: Transaction[] = [];
  private nextSequence = 1;

  create(newTransaction: NewTransaction): Promise<Transaction> {
    const now = new Date();
    const transaction: Transaction = {
      id: fakeId(this.nextSequence++),
      ...newTransaction,
      createdAt: now,
      updatedAt: now,
    };
    this.transactions.push(transaction);
    return Promise.resolve(transaction);
  }

  listPage(query: TransactionPageQuery): Promise<Transaction[]> {
    const page = this.transactions
      .filter((transaction) => matches(transaction, query))
      .sort(newestFirst)
      .slice(0, query.limit);
    return Promise.resolve(page);
  }

  findById(
    userId: string,
    transactionId: string,
  ): Promise<Transaction | undefined> {
    return Promise.resolve(this.findOwned(userId, transactionId));
  }

  update(transaction: Transaction): Promise<Transaction> {
    const updated: Transaction = { ...transaction, updatedAt: new Date() };
    const index = this.transactions.findIndex(
      (stored) => stored.id === transaction.id,
    );
    this.transactions[index] = updated;
    return Promise.resolve(updated);
  }

  delete(userId: string, transactionId: string): Promise<void> {
    const owned = this.findOwned(userId, transactionId);
    if (owned) {
      this.transactions.splice(this.transactions.indexOf(owned), 1);
    }
    return Promise.resolve();
  }

  private findOwned(
    userId: string,
    transactionId: string,
  ): Transaction | undefined {
    return this.transactions.find(
      (transaction) =>
        transaction.userId === userId && transaction.id === transactionId,
    );
  }
}
