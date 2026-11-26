import type { Cents } from '@modules/accounts/domain/money.js';
import type { YearMonth } from '../domain/year-month.js';

export const SPENDING_BY_LABEL_REPORT = Symbol('SPENDING_BY_LABEL_REPORT');

export type LabelSpending = {
  labelId: string;
  name: string;
  color: string;
  // Full amount of every expense the label tags, as a positive number.
  amount: Cents;
};

export type MonthSpending = {
  // Each expense counted once, however many labels it has.
  total: Cents;
  byLabel: LabelSpending[];
  unlabeled: Cents;
};

export type MonthSpendingQuery = {
  userId: string;
  month: YearMonth;
};

export interface SpendingByLabelReport {
  // Only the month's negative transactions count; transfers are left out.
  monthSpending(query: MonthSpendingQuery): Promise<MonthSpending>;
}
