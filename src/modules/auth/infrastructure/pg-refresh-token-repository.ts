import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../shared/database/database.tokens.js';
import { InvalidRefreshTokenError } from '../domain/auth.errors.js';
import type { RefreshToken } from '../domain/refresh-token.js';
import type {
  NewRefreshToken,
  RefreshTokenReplacement,
  RefreshTokenRepository,
} from '../domain/refresh-token-repository.js';

// Shape of a row as `pg` returns it: empty columns come back as null.
type RefreshTokenRow = {
  id: string;
  user_id: string;
  family_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by_id: string | null;
  created_at: Date;
};

const REFRESH_TOKEN_COLUMNS =
  'id, user_id, family_id, token_hash, expires_at, revoked_at, replaced_by_id, created_at';

const INSERT_FIRST_OF_FAMILY = `
    INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
    VALUES ($1, gen_random_uuid(), $2, $3)
`;

// One statement, so it's atomic: the UPDATE locks the current row, and a
// parallel rotation of the same token finds it revoked and inserts nothing.
const ROTATE = `
    WITH revoked AS (
        UPDATE refresh_tokens
        SET revoked_at = now(), replaced_by_id = gen_random_uuid()
        WHERE id = $1 AND revoked_at IS NULL
        RETURNING user_id, family_id, replaced_by_id
    )
    INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at)
    SELECT replaced_by_id, user_id, family_id, $2, $3 FROM revoked
`;

const REVOKE = `
    UPDATE refresh_tokens SET revoked_at = now()
    WHERE id = $1 AND revoked_at IS NULL
`;

const REVOKE_FAMILY = `
    UPDATE refresh_tokens SET revoked_at = now()
    WHERE family_id = $1 AND revoked_at IS NULL
`;

const toRefreshToken = (row: RefreshTokenRow): RefreshToken => ({
  id: row.id,
  userId: row.user_id,
  familyId: row.family_id,
  tokenHash: row.token_hash,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at ?? undefined,
  replacedById: row.replaced_by_id ?? undefined,
  createdAt: row.created_at,
});

@Injectable()
export class PgRefreshTokenRepository implements RefreshTokenRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  async create(newRefreshToken: NewRefreshToken): Promise<void> {
    await this.pool.query(INSERT_FIRST_OF_FAMILY, [
      newRefreshToken.userId,
      newRefreshToken.tokenHash,
      newRefreshToken.expiresAt,
    ]);
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | undefined> {
    const result = await this.pool.query<RefreshTokenRow>(
      `SELECT ${REFRESH_TOKEN_COLUMNS} FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash],
    );
    if (result.rows.length === 0) {
      return undefined;
    }
    return toRefreshToken(result.rows[0]);
  }

  async rotate(
    currentId: string,
    replacement: RefreshTokenReplacement,
  ): Promise<void> {
    const result = await this.pool.query(ROTATE, [
      currentId,
      replacement.tokenHash,
      replacement.expiresAt,
    ]);
    if (!result.rowCount) {
      throw new InvalidRefreshTokenError();
    }
  }

  async revoke(id: string): Promise<void> {
    await this.pool.query(REVOKE, [id]);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.pool.query(REVOKE_FAMILY, [familyId]);
  }
}
