import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL } from '@shared/database/database.tokens.js';
import type { Pool } from 'pg';
import type {
  AccountLookup,
  TransactionAccount,
} from '../domain/account-lookup.js';

type AccountRow = {
  id: string;
  is_archived: boolean;
};

@Injectable()
export class PgAccountLookup implements AccountLookup {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  async findOwnedAccount(
    userId: string,
    accountId: string,
  ): Promise<TransactionAccount | undefined> {
    const result = await this.pool.query<AccountRow>(
      `SELECT id, archived_at IS NOT NULL AS is_archived
         FROM accounts WHERE id = $1 AND user_id = $2`,
      [accountId, userId],
    );

    return result.rows
      .map((row) => ({ id: row.id, isArchived: row.is_archived }))
      .at(0);
  }
}
