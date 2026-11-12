const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

export const REFRESH_TOKEN_TTL_MS = 7 * MILLISECONDS_PER_DAY;

export type RefreshToken = {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedById?: string;
  createdAt: Date;
};

export const calculateRefreshTokenExpiry = (issuedAt: Date): Date =>
  new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_MS);

export const isRefreshTokenRevoked = (token: RefreshToken): boolean =>
  !!token.revokedAt;

export const isRefreshTokenExpired = (
  token: RefreshToken,
  now: Date,
): boolean => token.expiresAt.getTime() <= now.getTime();
