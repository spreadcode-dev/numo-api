import type { Pool } from 'pg';
import { InvalidRefreshTokenError } from '../domain/auth.errors.js';
import { PgRefreshTokenRepository } from './pg-refresh-token-repository.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const CREATED_AT = new Date('2026-11-10T12:00:00Z');
const EXPIRES_AT = new Date('2026-11-17T12:00:00Z');
const TOKEN_ID = '6f1c1a9e-0000-4000-8000-000000000010';
const NEXT_TOKEN_ID = '6f1c1a9e-0000-4000-8000-000000000011';
const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';
const FAMILY_ID = '6f1c1a9e-0000-4000-8000-000000000020';
const TOKEN_HASH = 'a'.repeat(64);

const ACTIVE_ROW = {
  id: TOKEN_ID,
  user_id: USER_ID,
  family_id: FAMILY_ID,
  token_hash: TOKEN_HASH,
  expires_at: EXPIRES_AT,
  revoked_at: null,
  replaced_by_id: null,
  created_at: CREATED_AT,
};

describe('PgRefreshTokenRepository', () => {
  it('should insert the first token of a family with its hash and expiry', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [] });
    const repository = new PgRefreshTokenRepository(poolWithQuery(query));

    // Act
    await repository.create({
      userId: USER_ID,
      tokenHash: TOKEN_HASH,
      expiresAt: EXPIRES_AT,
    });

    // Assert
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      USER_ID,
      TOKEN_HASH,
      EXPIRES_AT,
    ]);
  });

  it('should map an active row to a token without revocation fields', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [ACTIVE_ROW] });
    const repository = new PgRefreshTokenRepository(poolWithQuery(query));

    // Act
    const token = await repository.findByHash(TOKEN_HASH);

    // Assert
    expect(token).toStrictEqual({
      id: TOKEN_ID,
      userId: USER_ID,
      familyId: FAMILY_ID,
      tokenHash: TOKEN_HASH,
      expiresAt: EXPIRES_AT,
      revokedAt: undefined,
      replacedById: undefined,
      createdAt: CREATED_AT,
    });
  });

  it('should map the revocation fields of a rotated row', async () => {
    // Arrange
    const rotatedRow = {
      ...ACTIVE_ROW,
      revoked_at: CREATED_AT,
      replaced_by_id: NEXT_TOKEN_ID,
    };
    const query = vi.fn().mockResolvedValue({ rows: [rotatedRow] });
    const repository = new PgRefreshTokenRepository(poolWithQuery(query));

    // Act
    const token = await repository.findByHash(TOKEN_HASH);

    // Assert
    expect(token).toMatchObject({
      revokedAt: CREATED_AT,
      replacedById: NEXT_TOKEN_ID,
    });
  });

  it('should return undefined when no row matches the hash', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgRefreshTokenRepository(poolWithQuery(query));

    // Act
    const token = await repository.findByHash(TOKEN_HASH);

    // Assert
    expect(token).toBeUndefined();
  });

  it('should rotate by passing the current id and the replacement', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [] });
    const repository = new PgRefreshTokenRepository(poolWithQuery(query));

    // Act
    await repository.rotate(TOKEN_ID, {
      tokenHash: TOKEN_HASH,
      expiresAt: EXPIRES_AT,
    });

    // Assert
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      TOKEN_ID,
      TOKEN_HASH,
      EXPIRES_AT,
    ]);
  });

  it('should reject a rotation when the current token was already revoked', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const repository = new PgRefreshTokenRepository(poolWithQuery(query));

    // Act
    const rotate = repository.rotate(TOKEN_ID, {
      tokenHash: TOKEN_HASH,
      expiresAt: EXPIRES_AT,
    });

    // Assert
    await expect(rotate).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('should revoke a single token by id', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [] });
    const repository = new PgRefreshTokenRepository(poolWithQuery(query));

    // Act
    await repository.revoke(TOKEN_ID);

    // Assert
    expect(query).toHaveBeenCalledWith(expect.any(String), [TOKEN_ID]);
  });

  it('should revoke a whole family by family id', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rowCount: 2, rows: [] });
    const repository = new PgRefreshTokenRepository(poolWithQuery(query));

    // Act
    await repository.revokeFamily(FAMILY_ID);

    // Assert
    expect(query).toHaveBeenCalledWith(expect.any(String), [FAMILY_ID]);
  });
});
