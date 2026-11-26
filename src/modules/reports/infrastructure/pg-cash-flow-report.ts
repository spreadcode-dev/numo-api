import { Inject, Injectable } from '@nestjs/common';
import { toCents } from '@modules/accounts/domain/money.js';
import { PG_POOL } from '@shared/database/database.tokens.js';
import type { Pool } from 'pg';
import type {
  CashFlowPeriod,
  CashFlowReport,
  MonthlyCashFlow,
} from '../application/cash-flow-report.js';

type MonthlyCashFlowRow = {
  month: string;
  income: string;
  expense: string;
};

// generate_series yields every month of the period, so the LEFT JOIN keeps
// months without transactions (their sums are NULL, hence the COALESCE).
const MONTHLY_TOTALS = `
  SELECT to_char(m.month, 'YYYY-MM') AS month,
         COALESCE(SUM(t.amount) FILTER (WHERE t.amount > 0), 0) AS income,
         COALESCE(-SUM(t.amount) FILTER (WHERE t.amount < 0), 0) AS expense
    FROM generate_series($2::date, $3::date, interval '1 month') AS m(month)
    LEFT JOIN transactions t
      ON t.user_id = $1
     AND t.transfer_id IS NULL
     AND t.date >= m.month
     AND t.date < m.month + interval '1 month'
   GROUP BY m.month
   ORDER BY m.month`;

// pg returns the NUMERIC sums as strings; toCents rejects values beyond
// Number.MAX_SAFE_INTEGER instead of letting Number() round them.
const toMonthlyCashFlow = (row: MonthlyCashFlowRow): MonthlyCashFlow => ({
  month: row.month,
  income: toCents(Number(row.income)),
  expense: toCents(Number(row.expense)),
});

@Injectable()
export class PgCashFlowReport implements CashFlowReport {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  async monthlyTotals(period: CashFlowPeriod): Promise<MonthlyCashFlow[]> {
    const result = await this.pool.query<MonthlyCashFlowRow>(MONTHLY_TOTALS, [
      period.userId,
      period.from.firstDay(),
      period.to.firstDay(),
    ]);

    return result.rows.map(toMonthlyCashFlow);
  }
}
