import { Inject, Injectable } from '@nestjs/common';
import { toAccountType } from '@modules/accounts/domain/account-type.js';
import { toCents } from '@modules/accounts/domain/money.js';
import { PG_POOL } from '@shared/database/database.tokens.js';
import type { Pool } from 'pg';
import type {
  AccountBalance,
  BalancesReport,
} from '../application/balances-report.js';

type AccountBalanceRow = {
  id: string;
  name: string;
  type: string;
  balance: string;
};

// Same balance expression as the accounts module, so GET /accounts and this report always agree.
const ACTIVE_ACCOUNT_BALANCES = `
  SELECT id, name, type,
         opening_balance
           + COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.account_id = accounts.id), 0)
           AS balance
    FROM accounts
   WHERE user_id = $1 AND archived_at IS NULL`;

// pg returns the BIGINT + NUMERIC sum as a string; toCents rejects values
// beyond Number.MAX_SAFE_INTEGER instead of letting Number() round them.
const toAccountBalance = (row: AccountBalanceRow): AccountBalance => ({
  id: row.id,
  name: row.name,
  type: toAccountType(row.type),
  balance: toCents(Number(row.balance)),
});

@Injectable()
export class PgBalancesReport implements BalancesReport {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  async listActiveAccountBalances(userId: string): Promise<AccountBalance[]> {
    const result = await this.pool.query<AccountBalanceRow>(
      ACTIVE_ACCOUNT_BALANCES,
      [userId],
    );

    return result.rows.map(toAccountBalance);
  }
}
