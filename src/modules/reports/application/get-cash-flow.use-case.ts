import type { Clock } from '@modules/auth/domain/clock.js';
import { InvalidMonthCountError } from '../domain/reports.errors.js';
import { YearMonth } from '../domain/year-month.js';
import type { CashFlowReport, MonthlyCashFlow } from './cash-flow-report.js';

export const DEFAULT_MONTHS = 12;
export const MAX_MONTHS = 24;

export type CashFlowQuery = {
  userId: string;
  months?: number;
  // YYYY-MM; the current UTC month when omitted.
  to?: string;
};

const toMonthCount = (months: number = DEFAULT_MONTHS): number => {
  if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) {
    throw new InvalidMonthCountError();
  }
  return months;
};

export class GetCashFlowUseCase {
  constructor(
    private readonly cashFlowReport: CashFlowReport,
    private readonly clock: Clock,
  ) {}

  async execute(query: CashFlowQuery): Promise<MonthlyCashFlow[]> {
    const months = toMonthCount(query.months);
    const to = this.lastMonth(query.to);
    return this.cashFlowReport.monthlyTotals({
      userId: query.userId,
      from: to.monthsBefore(months - 1),
      to,
    });
  }

  private lastMonth(raw?: string): YearMonth {
    return raw === undefined
      ? YearMonth.of(this.clock.now())
      : YearMonth.parse(raw);
  }
}
