import type { TransactionLabelRepository } from '../../domain/transaction-label-repository.js';
import type { TransactionLabel } from '../../domain/transaction-label.js';
import type {
  NewTransaction,
  TransactionRepository,
} from '../../domain/transaction-repository.js';
import type { Transaction } from '../../domain/transaction.js';
import type { TransferRepository } from '../../domain/transfer-repository.js';
import type { Transfer, TransferLegs } from '../../domain/transfer.js';
import type {
  PagePosition,
  TransactionPageQuery,
  TransactionReader,
} from '../transaction-reader.js';
import { InMemoryLabelLookup } from './label-lookup.fake.js';

type Link = { transactionId: string; labelId: string };

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
  links: Link[],
): boolean =>
  transaction.userId === query.userId &&
  (query.labelId === undefined ||
    links.some(
      (link) =>
        link.transactionId === transaction.id && link.labelId === query.labelId,
    )) &&
  (query.accountId === undefined ||
    transaction.accountId === query.accountId) &&
  (query.from === undefined || transaction.date.value >= query.from.value) &&
  (query.to === undefined || transaction.date.value <= query.to.value) &&
  (query.after === undefined || newestFirst(query.after, transaction) < 0);

// Also holds the transaction_labels links; label names and colours come from
// the label catalog, as the SQL join does.
export class InMemoryTransactionRepository
  implements
    TransactionRepository,
    TransactionReader,
    TransactionLabelRepository,
    TransferRepository
{
  readonly transactions: Transaction[] = [];
  links: Link[] = [];
  private nextSequence = 1;
  private nextTransfer = 1;

  constructor(
    private readonly labelCatalog: InMemoryLabelLookup = new InMemoryLabelLookup(),
  ) {}

  create(newTransaction: NewTransaction): Promise<Transaction> {
    return Promise.resolve(this.insert(newTransaction));
  }

  listPage(query: TransactionPageQuery): Promise<Transaction[]> {
    const page = this.transactions
      .filter((transaction) => matches(transaction, query, this.links))
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
      this.links = this.links.filter(
        (link) => link.transactionId !== transactionId,
      );
    }
    return Promise.resolve();
  }

  replaceLabels(transactionId: string, labelIds: string[]): Promise<void> {
    this.links = [
      ...this.links.filter((link) => link.transactionId !== transactionId),
      ...labelIds.map((labelId) => ({ transactionId, labelId })),
    ];
    return Promise.resolve();
  }

  labelsOf(transactionIds: string[]): Promise<Map<string, TransactionLabel[]>> {
    const labels = new Map<string, TransactionLabel[]>();
    for (const link of this.links) {
      const label = this.labelCatalog.findById(link.labelId);
      if (transactionIds.includes(link.transactionId) && label) {
        labels.set(link.transactionId, [
          ...(labels.get(link.transactionId) ?? []),
          label,
        ]);
      }
    }
    return Promise.resolve(labels);
  }

  createTransfer(legs: TransferLegs): Promise<Transfer> {
    const transferId = `transfer-${this.nextTransfer++}`;
    const outgoing = this.insert({ ...legs.outgoing, transferId });
    const incoming = this.insert({ ...legs.incoming, transferId });
    return Promise.resolve({ transferId, outgoing, incoming });
  }

  findTransferLegs(userId: string, transferId: string): Promise<Transaction[]> {
    return Promise.resolve(this.legsOf(userId, transferId));
  }

  async deleteTransfer(userId: string, transferId: string): Promise<void> {
    for (const leg of this.legsOf(userId, transferId)) {
      await this.delete(userId, leg.id);
    }
  }

  private insert(
    fields: NewTransaction & Pick<Transaction, 'transferId'>,
  ): Transaction {
    const now = new Date();
    const transaction: Transaction = {
      id: fakeId(this.nextSequence++),
      ...fields,
      createdAt: now,
      updatedAt: now,
    };
    this.transactions.push(transaction);
    return transaction;
  }

  private legsOf(userId: string, transferId: string): Transaction[] {
    return this.transactions.filter(
      (transaction) =>
        transaction.userId === userId && transaction.transferId === transferId,
    );
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
