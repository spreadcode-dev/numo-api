import type { Pool } from 'pg';
import { PgAccountLookup } from './pg-account-lookup.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';
const ACCOUNT_ID = '9a2b3c4d-0000-4000-8000-000000000001';

describe('PgAccountLookup', () => {
  it("should find the user's account and whether it is archived", async () => {
    // Arrange
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [{ id: ACCOUNT_ID, is_archived: true }] });
    const lookup = new PgAccountLookup(poolWithQuery(query));

    // Act
    const account = await lookup.findOwnedAccount(USER_ID, ACCOUNT_ID);

    // Assert
    expect(account).toEqual({ id: ACCOUNT_ID, isArchived: true });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND user_id = $2'),
      [ACCOUNT_ID, USER_ID],
    );
  });

  it('should find nothing when no row matches the id and user', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const lookup = new PgAccountLookup(poolWithQuery(query));

    // Act
    const account = await lookup.findOwnedAccount(USER_ID, ACCOUNT_ID);

    // Assert
    expect(account).toBeUndefined();
  });
});
