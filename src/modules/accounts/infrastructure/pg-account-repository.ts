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

// The unique index on (user_id, lower(name)) is the last line of defence when
// two requests race past the existsByName check.
const toWriteError = (error: unknown): unknown =>
  isUniqueViolation(error) ? new AccountNameAlreadyUsedError() : error;

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
      throw toWriteError(error);
    }
  }

  async listByUser(userId: string): Promise<Account[]> {
    const result = await this.pool.query<AccountRow>(
      `SELECT ${ACCOUNT_COLUMNS} FROM accounts WHERE user_id = $1`,
      [userId],
    );

    return result.rows.map(toAccount);
  }

  async findById(
    userId: string,
    accountId: string,
  ): Promise<Account | undefined> {
    const result = await this.pool.query<AccountRow>(
      `SELECT ${ACCOUNT_COLUMNS} FROM accounts WHERE id = $1 AND user_id = $2`,
      [accountId, userId],
    );

    return result.rows.map(toAccount).at(0);
  }

  async update(account: Account): Promise<Account> {
    try {
      const result = await this.pool.query<AccountRow>(
        `UPDATE accounts
            SET name = $3, type = $4, opening_balance = $5, updated_at = now()
          WHERE id = $1 AND user_id = $2
          RETURNING ${ACCOUNT_COLUMNS}`,
        [
          account.id,
          account.userId,
          account.name.value,
          account.type,
          account.openingBalance,
        ],
      );
      return toAccount(result.rows[0]);
    } catch (error) {
      throw toWriteError(error);
    }
  }

  async archive(userId: string, accountId: string): Promise<Account> {
    const result = await this.pool.query<AccountRow>(
      `UPDATE accounts SET archived_at = now(), updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING ${ACCOUNT_COLUMNS}`,
      [accountId, userId],
    );

    return toAccount(result.rows[0]);
  }

  async unarchive(userId: string, accountId: string): Promise<Account> {
    const result = await this.pool.query<AccountRow>(
      `UPDATE accounts SET archived_at = NULL, updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING ${ACCOUNT_COLUMNS}`,
      [accountId, userId],
    );

    return toAccount(result.rows[0]);
  }
}
