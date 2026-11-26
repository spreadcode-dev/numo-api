import type { TransactionLabelRepository } from '../domain/transaction-label-repository.js';
import { TransactionDate } from '../domain/transaction-date.js';
import { InvalidPageLimitError } from '../domain/transactions.errors.js';
import type { Transaction } from '../domain/transaction.js';
import { decodePageCursor, encodePageCursor } from './page-cursor.js';
import type {
  TransactionPageQuery,
  TransactionReader,
} from './transaction-reader.js';
import { type TransactionView, toTransactionView } from './transaction-view.js';

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

export type ListTransactionsQuery = {
  userId: string;
  accountId?: string;
  labelId?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

export type TransactionPage = {
  items: TransactionView[];
  nextCursor?: string;
};

const toPageLimit = (limit: number = DEFAULT_PAGE_LIMIT): number => {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
    throw new InvalidPageLimitError();
  }
  return limit;
};

const toOptionalDate = (raw?: string): TransactionDate | undefined =>
  raw === undefined ? undefined : TransactionDate.create(raw);

const toPageQuery = (query: ListTransactionsQuery): TransactionPageQuery => ({
  userId: query.userId,
  accountId: query.accountId,
  labelId: query.labelId,
  from: toOptionalDate(query.from),
  to: toOptionalDate(query.to),
  after:
    query.cursor === undefined ? undefined : decodePageCursor(query.cursor),
  limit: toPageLimit(query.limit),
});

export class ListTransactionsUseCase {
  constructor(
    private readonly transactionReader: TransactionReader,
    private readonly transactionLabelRepository: TransactionLabelRepository,
  ) {}

  // Reads one row past the page: if it exists there is a next page, and the
  // cursor points at the last row returned, never at the extra one.
  async execute(query: ListTransactionsQuery): Promise<TransactionPage> {
    const pageQuery = toPageQuery(query);
    const rows = await this.transactionReader.listPage({
      ...pageQuery,
      limit: pageQuery.limit + 1,
    });
    const items = rows.slice(0, pageQuery.limit);
    const hasNextPage = rows.length > pageQuery.limit;

    return {
      items: await this.withLabels(items),
      nextCursor: hasNextPage ? cursorAfter(items) : undefined,
    };
  }

  // One query for the whole page's labels, never one per transaction.
  private async withLabels(items: Transaction[]): Promise<TransactionView[]> {
    const labels = await this.transactionLabelRepository.labelsOf(
      items.map((item) => item.id),
    );
    return items.map((item) =>
      toTransactionView(item, labels.get(item.id) ?? []),
    );
  }
}

const cursorAfter = (items: Transaction[]): string => {
  const last = items[items.length - 1];
  return encodePageCursor({ date: last.date, id: last.id });
};
