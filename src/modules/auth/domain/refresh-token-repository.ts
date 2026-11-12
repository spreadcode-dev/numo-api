import type { RefreshToken } from './refresh-token.js';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export type NewRefreshToken = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type RefreshTokenReplacement = {
  tokenHash: string;
  expiresAt: Date;
};

export interface RefreshTokenRepository {
  // Stores the first token of a new family (a new login).
  create(newRefreshToken: NewRefreshToken): Promise<void>;

  findByHash(tokenHash: string): Promise<RefreshToken | undefined>;

  // Atomically revokes the current token and stores its replacement in the
  // same family. Throws InvalidRefreshTokenError when the current token was
  // already revoked, e.g. by a parallel refresh that won the race.
  rotate(
    currentId: string,
    replacement: RefreshTokenReplacement,
  ): Promise<void>;

  revoke(id: string): Promise<void>;

  revokeFamily(familyId: string): Promise<void>;
}
