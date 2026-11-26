import type { Pool } from 'pg';
import { YearMonth } from '../domain/year-month.js';
import { PgSpendingByLabelReport } from './pg-spending-by-label-report.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';
const LABEL_ID = '7b3c4d5e-0000-4000-8000-000000000001';

const QUERY = { userId: USER_ID, month: YearMonth.parse('2026-11') };

const HOUSING_ROW = {
  label_id: LABEL_ID,
  name: 'Housing',
  color: '#2563eb',
  amount: '200000',
  month_total: '205000',
};
const UNLABELED_ROW = {
  label_id: null,
  name: null,
  color: null,
  amount: '5000',
  month_total: '205000',
};

describe('PgSpendingByLabelReport', () => {
  it('should split label rows from the unlabeled row and read the month total', async () => {
    // Arrange
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [UNLABELED_ROW, HOUSING_ROW] });
    const report = new PgSpendingByLabelReport(poolWithQuery(query));

    // Act
    const spending = await report.monthSpending(QUERY);

    // Assert
    expect(spending).toEqual({
      total: 205000,
      byLabel: [
        {
          labelId: LABEL_ID,
          name: 'Housing',
          color: '#2563eb',
          amount: 200000,
        },
      ],
      unlabeled: 5000,
    });
  });

  it('should answer zeros when the month has no expenses', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const report = new PgSpendingByLabelReport(poolWithQuery(query));

    // Act
    const spending = await report.monthSpending(QUERY);

    // Assert
    expect(spending).toEqual({ total: 0, byLabel: [], unlabeled: 0 });
  });

  it('should query from the first day of the month', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const report = new PgSpendingByLabelReport(poolWithQuery(query));

    // Act
    await report.monthSpending(QUERY);

    // Assert
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      USER_ID,
      '2026-11-01',
    ]);
  });

  it("should only read the user's expenses that aren't transfer legs", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const report = new PgSpendingByLabelReport(poolWithQuery(query));

    // Act
    await report.monthSpending(QUERY);

    // Assert
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('user_id = $1');
    expect(sql).toContain('transfer_id IS NULL');
    expect(sql).toContain('amount < 0');
  });
});
