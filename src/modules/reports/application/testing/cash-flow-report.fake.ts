import type { YearMonth } from '../../domain/year-month.js';
import type {
  CashFlowPeriod,
  CashFlowReport,
  MonthlyCashFlow,
} from '../cash-flow-report.js';

export type RecordedTransaction = {
  userId: string;
  date: string;
  amount: number;
  transferId?: string;
};

const monthsBetween = (from: YearMonth, to: YearMonth): YearMonth[] => {
  const months = [to];
  while (months[0].value !== from.value) {
    months.unshift(months[0].monthsBefore(1));
  }
  return months;
};

export class InMemoryCashFlowReport implements CashFlowReport {
  private readonly transactions: RecordedTransaction[] = [];

  givenTransactions(...transactions: RecordedTransaction[]): void {
    this.transactions.push(...transactions);
  }

  monthlyTotals(period: CashFlowPeriod): Promise<MonthlyCashFlow[]> {
    const counted = this.transactions.filter(
      (transaction) =>
        transaction.userId === period.userId && !transaction.transferId,
    );
    return Promise.resolve(
      monthsBetween(period.from, period.to).map((month) =>
        totalsOf(
          month.value,
          counted.filter((transaction) =>
            transaction.date.startsWith(month.value),
          ),
        ),
      ),
    );
  }
}

const totalsOf = (
  month: string,
  transactions: RecordedTransaction[],
): MonthlyCashFlow => ({
  month,
  income: transactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((total, transaction) => total + transaction.amount, 0),
  expense: transactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((total, transaction) => total - transaction.amount, 0),
});
