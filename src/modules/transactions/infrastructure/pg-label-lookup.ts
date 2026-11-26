import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL } from '@shared/database/database.tokens.js';
import type { Pool } from 'pg';
import type { LabelLookup } from '../domain/label-lookup.js';
import type { TransactionLabel } from '../domain/transaction-label.js';

@Injectable()
export class PgLabelLookup implements LabelLookup {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  async findOwnedLabels(
    userId: string,
    labelIds: string[],
  ): Promise<TransactionLabel[]> {
    const result = await this.pool.query<TransactionLabel>(
      `SELECT id, name, color FROM labels
        WHERE user_id = $1 AND id = ANY($2::uuid[])`,
      [userId, labelIds],
    );

    return result.rows;
  }
}
