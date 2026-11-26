import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL } from '@shared/database/database.tokens.js';
import type { Pool } from 'pg';
import type { NewTransaction } from '../domain/transaction-repository.js';
import type { Transaction } from '../domain/transaction.js';
import type { TransferRepository } from '../domain/transfer-repository.js';
import type { Transfer, TransferLegs } from '../domain/transfer.js';
import {
  TRANSACTION_COLUMNS,
  type TransactionRow,
  toTransaction,
} from './transaction-row.js';

const legValues = (leg: NewTransaction): unknown[] => [
  leg.userId,
  leg.accountId,
  leg.date.value,
  leg.amount,
  leg.description.value,
];

type LegRow = TransactionRow & { transfer_id: string };

// RETURNING doesn't promise any row order, so each leg is found by its account.
const legRowOn = (rows: TransactionRow[], accountId: string): LegRow => {
  const row = rows.find((candidate) => candidate.account_id === accountId);
  if (row?.transfer_id == null) {
    throw new Error(`Transfer insert returned no leg for account ${accountId}`);
  }
  return { ...row, transfer_id: row.transfer_id };
};

const toTransfer = (rows: TransactionRow[], legs: TransferLegs): Transfer => {
  const outgoing = legRowOn(rows, legs.outgoing.accountId);
  const incoming = legRowOn(rows, legs.incoming.accountId);
  return {
    transferId: outgoing.transfer_id,
    outgoing: toTransaction(outgoing),
    incoming: toTransaction(incoming),
  };
};

@Injectable()
export class PgTransferRepository implements TransferRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  // A single statement is all or nothing: if either row fails (a foreign key,
  // a CHECK), neither leg is saved. MATERIALIZED makes the transfer id one
  // value shared by both rows, not one gen_random_uuid() call per row.
  async createTransfer(legs: TransferLegs): Promise<Transfer> {
    const result = await this.pool.query<TransactionRow>(
      `WITH transfer AS MATERIALIZED (SELECT gen_random_uuid() AS id)
       INSERT INTO transactions
              (user_id, account_id, date, amount, description, transfer_id)
       SELECT leg.user_id, leg.account_id, leg.date, leg.amount, leg.description, transfer.id
         FROM transfer,
              (VALUES ($1::uuid, $2::uuid, $3::date, $4::bigint, $5::text),
                      ($6::uuid, $7::uuid, $8::date, $9::bigint, $10::text))
              AS leg (user_id, account_id, date, amount, description)
       RETURNING ${TRANSACTION_COLUMNS}`,
      [...legValues(legs.outgoing), ...legValues(legs.incoming)],
    );
    return toTransfer(result.rows, legs);
  }

  async findTransferLegs(
    userId: string,
    transferId: string,
  ): Promise<Transaction[]> {
    const result = await this.pool.query<TransactionRow>(
      `SELECT ${TRANSACTION_COLUMNS} FROM transactions
        WHERE user_id = $1 AND transfer_id = $2`,
      [userId, transferId],
    );

    return result.rows.map(toTransaction);
  }

  async deleteTransfer(userId: string, transferId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM transactions WHERE user_id = $1 AND transfer_id = $2',
      [userId, transferId],
    );
  }
}
