import { Inject, Injectable } from '@nestjs/common';
import { toCents } from '@modules/accounts/domain/money.js';
import { PG_POOL } from '@shared/database/database.tokens.js';
import type { Pool } from 'pg';
import type {
  LabelSpending,
  MonthSpending,
  MonthSpendingQuery,
  SpendingByLabelReport,
} from '../application/spending-by-label-report.js';

// label_id, name and color are NULL on the row that groups unlabeled expenses.
type SpendingRow = {
  label_id: string | null;
  name: string | null;
  color: string | null;
  amount: string;
  month_total: string;
};

type LabelledSpendingRow = SpendingRow & {
  label_id: string;
  name: string;
  color: string;
};

// The LEFT JOINs repeat an expense once per label (full amount under each) and
// keep unlabeled ones in a NULL group. month_total reads the CTE instead, so
// each expense counts once however many labels it has.
const MONTH_SPENDING = `
  WITH expenses AS (
    SELECT id, -amount AS amount
      FROM transactions
     WHERE user_id = $1
       AND transfer_id IS NULL
       AND amount < 0
       AND date >= $2::date
       AND date < $2::date + interval '1 month')
  SELECT l.id AS label_id, l.name, l.color, SUM(e.amount) AS amount,
         (SELECT SUM(amount) FROM expenses) AS month_total
    FROM expenses e
    LEFT JOIN transaction_labels tl ON tl.transaction_id = e.id
    LEFT JOIN labels l ON l.id = tl.label_id
   GROUP BY l.id, l.name, l.color`;

const isLabelled = (row: SpendingRow): row is LabelledSpendingRow =>
  row.label_id !== null;

// pg returns NUMERIC sums as strings; toCents rejects values beyond
// Number.MAX_SAFE_INTEGER instead of letting Number() round them.
const toLabelSpending = (row: LabelledSpendingRow): LabelSpending => ({
  labelId: row.label_id,
  name: row.name,
  color: row.color,
  amount: toCents(Number(row.amount)),
});

const toMonthSpending = (rows: SpendingRow[]): MonthSpending => ({
  total: toCents(Number(rows.at(0)?.month_total ?? 0)),
  byLabel: rows.filter(isLabelled).map(toLabelSpending),
  unlabeled: toCents(Number(rows.find((row) => !isLabelled(row))?.amount ?? 0)),
});

@Injectable()
export class PgSpendingByLabelReport implements SpendingByLabelReport {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  async monthSpending(query: MonthSpendingQuery): Promise<MonthSpending> {
    const result = await this.pool.query<SpendingRow>(MONTH_SPENDING, [
      query.userId,
      query.month.firstDay(),
    ]);

    return toMonthSpending(result.rows);
  }
}
