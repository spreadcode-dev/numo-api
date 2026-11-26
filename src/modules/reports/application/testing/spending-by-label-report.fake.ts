import type {
  LabelSpending,
  MonthSpending,
  MonthSpendingQuery,
  SpendingByLabelReport,
} from '../spending-by-label-report.js';

export type TaggedLabel = { id: string; name: string; color: string };

export type LabelledTransaction = {
  userId: string;
  date: string;
  amount: number;
  transferId?: string;
  labels: TaggedLabel[];
};

type Expense = { amount: number; labels: TaggedLabel[] };

const sumOf = (expenses: Expense[]): number =>
  expenses.reduce((total, expense) => total + expense.amount, 0);

const totalsPerLabel = (expenses: Expense[]): LabelSpending[] => {
  const perLabel = new Map<string, LabelSpending>();
  for (const expense of expenses) {
    for (const label of expense.labels) {
      const current = perLabel.get(label.id);
      perLabel.set(label.id, {
        labelId: label.id,
        name: label.name,
        color: label.color,
        amount: (current?.amount ?? 0) + expense.amount,
      });
    }
  }
  return [...perLabel.values()];
};

export class InMemorySpendingByLabelReport implements SpendingByLabelReport {
  private readonly transactions: LabelledTransaction[] = [];

  givenTransactions(...transactions: LabelledTransaction[]): void {
    this.transactions.push(...transactions);
  }

  monthSpending(query: MonthSpendingQuery): Promise<MonthSpending> {
    const expenses = this.expensesOf(query);
    return Promise.resolve({
      total: sumOf(expenses),
      byLabel: totalsPerLabel(expenses),
      unlabeled: sumOf(expenses.filter((expense) => !expense.labels.length)),
    });
  }

  private expensesOf(query: MonthSpendingQuery): Expense[] {
    return this.transactions
      .filter(
        (transaction) =>
          transaction.userId === query.userId &&
          !transaction.transferId &&
          transaction.amount < 0 &&
          transaction.date.startsWith(query.month.value),
      )
      .map((transaction) => ({
        amount: -transaction.amount,
        labels: transaction.labels,
      }));
  }
}
