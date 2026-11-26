import type { Cents } from '@modules/accounts/domain/money.js';
import type { YearMonth } from '../domain/year-month.js';

export const CASH_FLOW_REPORT = Symbol('CASH_FLOW_REPORT');

export type MonthlyCashFlow = {
  month: string;
  income: Cents;
  // Money that went out, as a positive number.
  expense: Cents;
};

export type CashFlowPeriod = {
  userId: string;
  from: YearMonth;
  to: YearMonth;
};

export interface CashFlowReport {
  // One entry per month from `from` to `to`, oldest first, and 0/0 for a month
  // without transactions. Transfers are left out: they move money, not earn or spend it.
  monthlyTotals(period: CashFlowPeriod): Promise<MonthlyCashFlow[]>;
}
