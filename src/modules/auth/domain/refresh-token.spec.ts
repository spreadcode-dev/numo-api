import {
  calculateRefreshTokenExpiry,
  isRefreshTokenExpired,
  isRefreshTokenRevoked,
  REFRESH_TOKEN_TTL_MS,
  type RefreshToken,
} from './refresh-token.js';

const ISSUED_AT = new Date('2026-11-10T12:00:00Z');

const tokenWith = (overrides: Partial<RefreshToken>): RefreshToken => ({
  id: 'token-1',
  userId: 'user-1',
  familyId: 'family-1',
  tokenHash: 'hash:secret',
  expiresAt: calculateRefreshTokenExpiry(ISSUED_AT),
  createdAt: ISSUED_AT,
  ...overrides,
});

describe('calculateRefreshTokenExpiry', () => {
  it('should expire 7 days after it was issued', () => {
    // Act
    const expiresAt = calculateRefreshTokenExpiry(ISSUED_AT);

    // Assert
    expect(expiresAt).toEqual(new Date('2026-11-17T12:00:00Z'));
  });
});

describe('isRefreshTokenRevoked', () => {
  it('should be false while revokedAt is not set', () => {
    // Act
    const isRevoked = isRefreshTokenRevoked(tokenWith({}));

    // Assert
    expect(isRevoked).toBe(false);
  });

  it('should be true once revokedAt is set', () => {
    // Act
    const isRevoked = isRefreshTokenRevoked(
      tokenWith({ revokedAt: ISSUED_AT }),
    );

    // Assert
    expect(isRevoked).toBe(true);
  });
});

describe('isRefreshTokenExpired', () => {
  it('should be false one millisecond before the expiry', () => {
    // Arrange
    const now = new Date(ISSUED_AT.getTime() + REFRESH_TOKEN_TTL_MS - 1);

    // Act
    const isExpired = isRefreshTokenExpired(tokenWith({}), now);

    // Assert
    expect(isExpired).toBe(false);
  });

  it('should be true exactly at the expiry', () => {
    // Arrange
    const now = new Date(ISSUED_AT.getTime() + REFRESH_TOKEN_TTL_MS);

    // Act
    const isExpired = isRefreshTokenExpired(tokenWith({}), now);

    // Assert
    expect(isExpired).toBe(true);
  });
});
