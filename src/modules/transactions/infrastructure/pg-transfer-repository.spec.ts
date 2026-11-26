import type { Pool } from 'pg';
import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import { PgTransferRepository } from './pg-transfer-repository.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';
const CHECKING_ID = '9a2b3c4d-0000-4000-8000-000000000001';
const CARD_ID = '9a2b3c4d-0000-4000-8000-000000000002';
const TRANSFER_ID = '7e8f9a0b-0000-4000-8000-000000000001';
const CREATED_AT = new Date('2026-11-26T12:00:00Z');

const leg = (accountId: string, amount: number) => ({
  userId: USER_ID,
  accountId,
  date: TransactionDate.create('2026-11-20'),
  amount,
  description: TransactionDescription.create('Card bill'),
});

const LEGS = {
  outgoing: leg(CHECKING_ID, -50000),
  incoming: leg(CARD_ID, 50000),
};

const legRow = (id: string, accountId: string, amount: string) => ({
  id,
  user_id: USER_ID,
  account_id: accountId,
  date: '2026-11-20',
  amount,
  description: 'Card bill',
  transfer_id: TRANSFER_ID,
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
});

const INCOMING_ROW = legRow(
  '1d2e3f4a-0000-4000-8000-000000000002',
  CARD_ID,
  '50000',
);
const OUTGOING_ROW = legRow(
  '1d2e3f4a-0000-4000-8000-000000000001',
  CHECKING_ID,
  '-50000',
);

describe('PgTransferRepository', () => {
  it('should insert both legs in a single statement with one shared transfer id', async () => {
    // Arrange
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [OUTGOING_ROW, INCOMING_ROW] });
    const repository = new PgTransferRepository(poolWithQuery(query));

    // Act
    await repository.createTransfer(LEGS);

    // Assert
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain(
      'WITH transfer AS MATERIALIZED (SELECT gen_random_uuid() AS id)',
    );
    expect(params).toEqual([
      USER_ID,
      CHECKING_ID,
      '2026-11-20',
      -50000,
      'Card bill',
      USER_ID,
      CARD_ID,
      '2026-11-20',
      50000,
      'Card bill',
    ]);
  });

  it('should tell the legs apart by account, whatever order Postgres returns them in', async () => {
    // Arrange
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [INCOMING_ROW, OUTGOING_ROW] });
    const repository = new PgTransferRepository(poolWithQuery(query));

    // Act
    const transfer = await repository.createTransfer(LEGS);

    // Assert
    expect(transfer.transferId).toBe(TRANSFER_ID);
    expect(transfer.outgoing).toMatchObject({
      id: OUTGOING_ROW.id,
      accountId: CHECKING_ID,
      amount: -50000,
      transferId: TRANSFER_ID,
    });
    expect(transfer.incoming).toMatchObject({
      accountId: CARD_ID,
      amount: 50000,
    });
  });

  it('should fail loudly if a leg is missing from the insert result', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [OUTGOING_ROW] });
    const repository = new PgTransferRepository(poolWithQuery(query));

    // Act
    const create = repository.createTransfer(LEGS);

    // Assert
    await expect(create).rejects.toThrow(/no leg for account/);
  });

  it("should find the user's legs of a transfer", async () => {
    // Arrange
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [OUTGOING_ROW, INCOMING_ROW] });
    const repository = new PgTransferRepository(poolWithQuery(query));

    // Act
    const legs = await repository.findTransferLegs(USER_ID, TRANSFER_ID);

    // Assert
    expect(legs).toHaveLength(2);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1 AND transfer_id = $2'),
      [USER_ID, TRANSFER_ID],
    );
  });

  it("should delete both legs of the user's transfer", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgTransferRepository(poolWithQuery(query));

    // Act
    await repository.deleteTransfer(USER_ID, TRANSFER_ID);

    // Assert
    expect(query).toHaveBeenCalledWith(
      'DELETE FROM transactions WHERE user_id = $1 AND transfer_id = $2',
      [USER_ID, TRANSFER_ID],
    );
  });
});
