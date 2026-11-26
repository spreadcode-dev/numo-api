import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL } from '@shared/database/database.tokens.js';
import type { Pool } from 'pg';
import type { TransactionLabelRepository } from '../domain/transaction-label-repository.js';
import type { TransactionLabel } from '../domain/transaction-label.js';

type LinkedLabelRow = TransactionLabel & { transaction_id: string };

const groupByTransaction = (
  rows: LinkedLabelRow[],
): Map<string, TransactionLabel[]> => {
  const labels = new Map<string, TransactionLabel[]>();
  for (const { transaction_id: transactionId, ...label } of rows) {
    labels.set(transactionId, [...(labels.get(transactionId) ?? []), label]);
  }
  return labels;
};

@Injectable()
export class PgTransactionLabelRepository implements TransactionLabelRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  // One statement, so the swap is atomic: both parts see the same snapshot,
  // the DELETE drops links outside the new set and the INSERT adds the rest.
  async replaceLabels(
    transactionId: string,
    labelIds: string[],
  ): Promise<void> {
    await this.pool.query(
      `WITH removed AS (
         DELETE FROM transaction_labels
          WHERE transaction_id = $1 AND label_id <> ALL($2::uuid[])
       )
       INSERT INTO transaction_labels (transaction_id, label_id)
       SELECT $1, unnest($2::uuid[])
       ON CONFLICT DO NOTHING`,
      [transactionId, labelIds],
    );
  }

  async labelsOf(
    transactionIds: string[],
  ): Promise<Map<string, TransactionLabel[]>> {
    if (transactionIds.length === 0) {
      return new Map();
    }
    const result = await this.pool.query<LinkedLabelRow>(
      `SELECT tl.transaction_id, l.id, l.name, l.color
         FROM transaction_labels tl
         JOIN labels l ON l.id = tl.label_id
        WHERE tl.transaction_id = ANY($1::uuid[])`,
      [transactionIds],
    );

    return groupByTransaction(result.rows);
  }
}
