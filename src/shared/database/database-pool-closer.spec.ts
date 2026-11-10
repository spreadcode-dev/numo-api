import { DatabasePoolCloser } from './database-pool-closer.js';
import type { Pool } from 'pg';

describe('DatabasePoolCloser', () => {
  it('should close the pool when the application shuts down', async () => {
    // Arrange
    const end = vi.fn().mockResolvedValue(undefined);
    const pool = { end } as unknown as Pool;
    const closer = new DatabasePoolCloser(pool);

    // Act
    await closer.onApplicationShutdown();

    // Assert
    expect(end).toHaveBeenCalledOnce();
  });
});
