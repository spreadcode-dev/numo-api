import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import {
  InvalidPageCursorError,
  InvalidPageLimitError,
  InvalidTransactionDateError,
} from '../domain/transactions.errors.js';
import { ListTransactionsUseCase } from './list-transactions.use-case.js';
import { InMemoryTransactionRepository } from './testing/transaction-repository.fake.js';
import type { TransactionView } from './transaction-view.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';
const CHECKING = 'account-checking';
const CARD = 'account-card';
const BRUNO_ACCOUNT = 'account-bruno';

type Seed = { userId?: string; accountId?: string; date: string };

const setUp = async (seeds: Seed[]) => {
  const repository = new InMemoryTransactionRepository();
  for (const seed of seeds) {
    await repository.create({
      userId: seed.userId ?? ANA,
      accountId: seed.accountId ?? CHECKING,
      date: TransactionDate.create(seed.date),
      amount: -100,
      description: TransactionDescription.create('Market'),
    });
  }
  return new ListTransactionsUseCase(repository);
};

// 120 transactions over 4 days, 30 per day, so many share a date.
const oneHundredTwenty = (): Seed[] =>
  Array.from({ length: 120 }, (_, index) => ({
    date: `2026-11-${String(10 + (index % 4)).padStart(2, '0')}`,
  }));

const isNewestFirst = (items: TransactionView[]): boolean =>
  items.every(
    (item, index) =>
      index === 0 ||
      items[index - 1].date > item.date ||
      (items[index - 1].date === item.date && items[index - 1].id > item.id),
  );

describe('ListTransactionsUseCase', () => {
  it('should return an empty page without a cursor when there is nothing', async () => {
    // Arrange
    const listTransactions = await setUp([]);

    // Act
    const page = await listTransactions.execute({ userId: ANA });

    // Assert
    expect(page).toEqual({ items: [], nextCursor: undefined });
  });

  it('should return the first 50, newest first, with a cursor', async () => {
    // Arrange
    const listTransactions = await setUp(oneHundredTwenty());

    // Act
    const page = await listTransactions.execute({ userId: ANA });

    // Assert
    expect(page.items).toHaveLength(50);
    expect(isNewestFirst(page.items)).toBe(true);
    expect(page.nextCursor).toEqual(expect.any(String));
  });

  it('should return every transaction exactly once when following the cursors', async () => {
    // Arrange
    const listTransactions = await setUp(oneHundredTwenty());
    const pages: TransactionView[][] = [];
    let cursor: string | undefined;

    // Act
    do {
      const page = await listTransactions.execute({ userId: ANA, cursor });
      pages.push(page.items);
      cursor = page.nextCursor;
    } while (cursor);

    // Assert
    const all = pages.flat();
    expect(pages.map((items) => items.length)).toEqual([50, 50, 20]);
    expect(new Set(all.map((item) => item.id)).size).toBe(120);
    expect(isNewestFirst(all)).toBe(true);
  });

  it('should not offer a next page when the last page is exactly full', async () => {
    // Arrange
    const listTransactions = await setUp(oneHundredTwenty());

    // Act
    const page = await listTransactions.execute({ userId: ANA, limit: 100 });
    const last = await listTransactions.execute({
      userId: ANA,
      limit: 20,
      cursor: page.nextCursor,
    });

    // Assert
    expect(last.items).toHaveLength(20);
    expect(last.nextCursor).toBeUndefined();
  });

  it.each([0, 101, 1.5, -1])('should reject a limit of %d', async (limit) => {
    // Arrange
    const listTransactions = await setUp([]);

    // Act
    const list = listTransactions.execute({ userId: ANA, limit });

    // Assert
    await expect(list).rejects.toThrow(InvalidPageLimitError);
  });

  it('should filter by account', async () => {
    // Arrange
    const listTransactions = await setUp([
      { accountId: CHECKING, date: '2026-11-10' },
      { accountId: CARD, date: '2026-11-11' },
    ]);

    // Act
    const page = await listTransactions.execute({
      userId: ANA,
      accountId: CARD,
    });

    // Assert
    expect(page.items.map((item) => item.accountId)).toEqual([CARD]);
  });

  it('should include both ends of the period', async () => {
    // Arrange
    const listTransactions = await setUp([
      { date: '2026-10-31' },
      { date: '2026-11-01' },
      { date: '2026-11-30' },
      { date: '2026-12-01' },
    ]);

    // Act
    const page = await listTransactions.execute({
      userId: ANA,
      from: '2026-11-01',
      to: '2026-11-30',
    });

    // Assert
    expect(page.items.map((item) => item.date)).toEqual([
      '2026-11-30',
      '2026-11-01',
    ]);
  });

  it('should combine the account and period filters', async () => {
    // Arrange
    const listTransactions = await setUp([
      { accountId: CARD, date: '2026-10-31' },
      { accountId: CARD, date: '2026-11-05' },
      { accountId: CHECKING, date: '2026-11-05' },
    ]);

    // Act
    const page = await listTransactions.execute({
      userId: ANA,
      accountId: CARD,
      from: '2026-11-01',
    });

    // Assert
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      accountId: CARD,
      date: '2026-11-05',
    });
  });

  it("should never show another user's transactions, even for their account", async () => {
    // Arrange
    const listTransactions = await setUp([
      { userId: BRUNO, accountId: BRUNO_ACCOUNT, date: '2026-11-10' },
    ]);

    // Act
    const page = await listTransactions.execute({
      userId: ANA,
      accountId: BRUNO_ACCOUNT,
    });

    // Assert
    expect(page.items).toEqual([]);
  });

  it('should reject a period day that does not exist', async () => {
    // Arrange
    const listTransactions = await setUp([]);

    // Act
    const list = listTransactions.execute({ userId: ANA, from: '2026-02-30' });

    // Assert
    await expect(list).rejects.toThrow(InvalidTransactionDateError);
  });

  it('should reject a tampered cursor', async () => {
    // Arrange
    const listTransactions = await setUp([]);

    // Act
    const list = listTransactions.execute({ userId: ANA, cursor: 'tampered' });

    // Assert
    await expect(list).rejects.toThrow(InvalidPageCursorError);
  });
});
