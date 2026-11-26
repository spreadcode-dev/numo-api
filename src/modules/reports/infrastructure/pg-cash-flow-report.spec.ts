import type { Pool } from 'pg';
import { YearMonth } from '../domain/year-month.js';
import { PgCashFlowReport } from './pg-cash-flow-report.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';

const PERIOD = {
  userId: USER_ID,
  from: YearMonth.parse('2026-10'),
  to: YearMonth.parse('2026-11'),
};

describe('PgCashFlowReport', () => {
  it('should map each month row to totals in cents', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({
      rows: [
        { month: '2026-10', income: '0', expense: '0' },
        { month: '2026-11', income: '500000', expense: '150000' },
      ],
    });
    const report = new PgCashFlowReport(poolWithQuery(query));

    // Act
    const months = await report.monthlyTotals(PERIOD);

    // Assert
    expect(months).toEqual([
      { month: '2026-10', income: 0, expense: 0 },
      { month: '2026-11', income: 500000, expense: 150000 },
    ]);
  });

  it('should query from the first day of the first month to the first day of the last', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const report = new PgCashFlowReport(poolWithQuery(query));

    // Act
    await report.monthlyTotals(PERIOD);

    // Assert
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      USER_ID,
      '2026-10-01',
      '2026-11-01',
    ]);
  });

  it("should only count the user's transactions that aren't transfer legs", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const report = new PgCashFlowReport(poolWithQuery(query));

    // Act
    await report.monthlyTotals(PERIOD);

    // Assert
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('t.user_id = $1');
    expect(sql).toContain('t.transfer_id IS NULL');
  });
});
