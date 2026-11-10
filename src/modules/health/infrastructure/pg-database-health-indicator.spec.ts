import type { Pool } from 'pg';
import { PgDatabaseHealthIndicator } from './pg-database-health-indicator.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

describe('PgDatabaseHealthIndicator', () => {
  it('should report up when the database answers a query', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const indicator = new PgDatabaseHealthIndicator(poolWithQuery(query));

    // Act
    const isUp = await indicator.isUp();

    // Assert
    expect(isUp).toBe(true);
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('should report down when the query fails', async () => {
    // Arrange
    const query = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));
    const indicator = new PgDatabaseHealthIndicator(poolWithQuery(query));

    // Act
    const isUp = await indicator.isUp();

    // Assert
    expect(isUp).toBe(false);
  });
});
