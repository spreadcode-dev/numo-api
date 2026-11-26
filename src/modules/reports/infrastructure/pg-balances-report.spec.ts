import { InvalidAmountError } from '@modules/accounts/domain/accounts.errors.js';
import type { Pool } from 'pg';
import { PgBalancesReport } from './pg-balances-report.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';
const ACCOUNT_ID = '9a2b3c4d-0000-4000-8000-000000000001';

const CARD_ROW = {
  id: ACCOUNT_ID,
  name: 'Nubank card',
  type: 'credit_card',
  balance: '-150000',
};

describe('PgBalancesReport', () => {
  it('should map each row to an account balance in cents', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [CARD_ROW] });
    const report = new PgBalancesReport(poolWithQuery(query));

    // Act
    const balances = await report.listActiveAccountBalances(USER_ID);

    // Assert
    expect(balances).toEqual([
      {
        id: ACCOUNT_ID,
        name: 'Nubank card',
        type: 'credit_card',
        balance: -150000,
      },
    ]);
  });

  it("should only read the user's non-archived accounts", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const report = new PgBalancesReport(poolWithQuery(query));

    // Act
    await report.listActiveAccountBalances(USER_ID);

    // Assert
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1 AND archived_at IS NULL'),
      [USER_ID],
    );
  });

  it('should reject a balance beyond the safe integer range', async () => {
    // Arrange
    const huge = { ...CARD_ROW, balance: '9007199254740993' };
    const query = vi.fn().mockResolvedValue({ rows: [huge] });
    const report = new PgBalancesReport(poolWithQuery(query));

    // Act
    const list = report.listActiveAccountBalances(USER_ID);

    // Assert
    await expect(list).rejects.toBeInstanceOf(InvalidAmountError);
  });
});
