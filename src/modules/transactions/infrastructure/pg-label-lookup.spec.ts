import type { Pool } from 'pg';
import { PgLabelLookup } from './pg-label-lookup.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';
const TRIP = {
  id: '3c4d5e6f-0000-4000-8000-000000000001',
  name: 'Trip',
  color: '#2563eb',
};

describe('PgLabelLookup', () => {
  it("should find only the user's labels among the ids", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [TRIP] });
    const lookup = new PgLabelLookup(poolWithQuery(query));

    // Act
    const labels = await lookup.findOwnedLabels(USER_ID, [TRIP.id]);

    // Assert
    expect(labels).toEqual([TRIP]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1 AND id = ANY($2::uuid[])'),
      [USER_ID, [TRIP.id]],
    );
  });
});
