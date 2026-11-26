import type { Pool } from 'pg';
import { PgTransactionLabelRepository } from './pg-transaction-label-repository.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const MARKET_ID = '1d2e3f4a-0000-4000-8000-000000000001';
const HOTEL_ID = '1d2e3f4a-0000-4000-8000-000000000002';
const TRIP = {
  id: '3c4d5e6f-0000-4000-8000-000000000001',
  name: 'Trip',
  color: '#2563eb',
};
const GROCERIES = {
  id: '3c4d5e6f-0000-4000-8000-000000000002',
  name: 'Groceries',
  color: '#15803d',
};

describe('PgTransactionLabelRepository', () => {
  it('should swap the whole set in a single statement', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgTransactionLabelRepository(poolWithQuery(query));

    // Act
    await repository.replaceLabels(MARKET_ID, [TRIP.id]);

    // Assert
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('label_id <> ALL($2::uuid[])');
    expect(sql).toContain('ON CONFLICT DO NOTHING');
    expect(params).toEqual([MARKET_ID, [TRIP.id]]);
  });

  it('should group the labels by transaction', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({
      rows: [
        { transaction_id: MARKET_ID, ...GROCERIES },
        { transaction_id: MARKET_ID, ...TRIP },
        { transaction_id: HOTEL_ID, ...TRIP },
      ],
    });
    const repository = new PgTransactionLabelRepository(poolWithQuery(query));

    // Act
    const labels = await repository.labelsOf([MARKET_ID, HOTEL_ID]);

    // Assert
    expect(labels).toEqual(
      new Map([
        [MARKET_ID, [GROCERIES, TRIP]],
        [HOTEL_ID, [TRIP]],
      ]),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('tl.transaction_id = ANY($1::uuid[])'),
      [[MARKET_ID, HOTEL_ID]],
    );
  });

  it('should not query the database for an empty page', async () => {
    // Arrange
    const query = vi.fn();
    const repository = new PgTransactionLabelRepository(poolWithQuery(query));

    // Act
    const labels = await repository.labelsOf([]);

    // Assert
    expect(labels).toEqual(new Map());
    expect(query).not.toHaveBeenCalled();
  });
});
