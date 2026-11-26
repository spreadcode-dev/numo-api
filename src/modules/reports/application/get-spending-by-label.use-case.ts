import type { Cents } from '@modules/accounts/domain/money.js';
import { YearMonth } from '../domain/year-month.js';
import type {
  MonthSpending,
  SpendingByLabelReport,
} from './spending-by-label-report.js';

export const UNLABELED_NAME = 'Unlabeled';

// Portuguese, ignoring case and accents, like the labels list.
const byName = new Intl.Collator('pt-BR', { sensitivity: 'base' });

export type SpendingEntry = {
  labelId?: string;
  name: string;
  color?: string;
  amount: Cents;
};

export type SpendingByLabel = {
  month: string;
  total: Cents;
  labels: SpendingEntry[];
};

export type SpendingByLabelQuery = {
  userId: string;
  // YYYY-MM
  month: string;
};

const byAmountDescending = (left: SpendingEntry, right: SpendingEntry) =>
  right.amount - left.amount || byName.compare(left.name, right.name);

const toEntries = (spending: MonthSpending): SpendingEntry[] => {
  const unlabeled =
    spending.unlabeled > 0
      ? [{ name: UNLABELED_NAME, amount: spending.unlabeled }]
      : [];
  return [...spending.byLabel, ...unlabeled].sort(byAmountDescending);
};

export class GetSpendingByLabelUseCase {
  constructor(private readonly spendingByLabelReport: SpendingByLabelReport) {}

  // Labels overlap: an expense tagged with two labels counts in full under
  // both, so the entries can add up to more than `total`.
  async execute(query: SpendingByLabelQuery): Promise<SpendingByLabel> {
    const month = YearMonth.parse(query.month);
    const spending = await this.spendingByLabelReport.monthSpending({
      userId: query.userId,
      month,
    });
    return {
      month: month.value,
      total: spending.total,
      labels: toEntries(spending),
    };
  }
}
