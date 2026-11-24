import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL } from '@shared/database/database.tokens.js';
import { isUniqueViolation } from '@shared/database/postgres-errors.js';
import type { Pool } from 'pg';
import { AccountName } from '../domain/account-name.js';
import type {
  AccountRepository,
  NewAccount,
} from '../domain/account-repository.js';
import { toAccountType } from '../domain/account-type.js';
import type { Account } from '../domain/account.js';
import { AccountNameAlreadyUsedError } from '../domain/accounts.errors.js';
import { toCurrency } from '../domain/currency.js';
import { toCents } from '../domain/money.js';

type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  currency: string;
  opening_balance: string;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const ACCOUNT_COLUMNS =
  'id, user_id, name, type, currency, opening_balance, archived_at, created_at, updated_at';

// pg returns BIGINT as a string; toCents rejects values beyond Number.MAX_SAFE_INTEGER
// instead of letting Number() round them silently.
const toAccount = (row: AccountRow): Account => ({
  id: row.id,
  userId: row.user_id,
  name: AccountName.create(row.name),
  type: toAccountType(row.type),
  currency: toCurrency(row.currency),
  openingBalance: toCents(Number(row.opening_balance)),
  archivedAt: row.archived_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

@Injectable()
export class PgAccountRepository implements AccountRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  async existsByName(userId: string, name: AccountName): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM accounts WHERE user_id = $1 AND lower(name) = lower($2)',
      [userId, name.value],
    );

    return result.rows.length > 0;
  }

  async create(newAccount: NewAccount): Promise<Account> {
    try {
      const result = await this.pool.query<AccountRow>(
        `INSERT INTO accounts (user_id, name, type, currency, opening_balance)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING ${ACCOUNT_COLUMNS}`,
        [
          newAccount.userId,
          newAccount.name.value,
          newAccount.type,
          newAccount.currency,
          newAccount.openingBalance,
        ],
      );
      return toAccount(result.rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AccountNameAlreadyUsedError();
      }
      throw error;
    }
  }

  async listByUser(userId: string): Promise<Account[]> {
    const result = await this.pool.query<AccountRow>(
      `SELECT ${ACCOUNT_COLUMNS} FROM accounts WHERE user_id = $1`,
      [userId],
    );

    return result.rows.map(toAccount);
  }
}
