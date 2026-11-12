import { InvalidRefreshTokenError } from '../domain/auth.errors.js';
import {
  isRefreshTokenRevoked,
  REFRESH_TOKEN_TTL_MS,
} from '../domain/refresh-token.js';
import { RefreshTokens } from './refresh-tokens.js';
import { FakeClock } from './testing/clock.fake.js';
import { FakeRefreshTokenGenerator } from './testing/refresh-token-generator.fake.js';
import { InMemoryRefreshTokenRepository } from './testing/refresh-token-repository.fake.js';

const NOW = new Date('2026-11-10T12:00:00Z');

const createRefreshTokens = () => {
  const clock = new FakeClock(NOW);
  const repository = new InMemoryRefreshTokenRepository(clock);
  const refreshTokens = new RefreshTokens(
    repository,
    new FakeRefreshTokenGenerator(),
    clock,
  );
  return { refreshTokens, repository, clock };
};

describe('RefreshTokens', () => {
  describe('issue', () => {
    it('should return a token that expires 7 days from now', async () => {
      // Arrange
      const { refreshTokens } = createRefreshTokens();

      // Act
      const issued = await refreshTokens.issue('user-1');

      // Assert
      expect(issued).toEqual({
        value: 'refresh-1',
        expiresAt: new Date('2026-11-17T12:00:00Z'),
      });
    });

    it('should store only the hash of the token', async () => {
      // Arrange
      const { refreshTokens, repository } = createRefreshTokens();

      // Act
      await refreshTokens.issue('user-1');

      // Assert
      expect(repository.tokens).toEqual([
        expect.objectContaining({
          userId: 'user-1',
          tokenHash: 'hashed:refresh-1',
        }),
      ]);
    });

    it('should start a new family on every login', async () => {
      // Arrange
      const { refreshTokens, repository } = createRefreshTokens();

      // Act
      await refreshTokens.issue('user-1');
      await refreshTokens.issue('user-1');

      // Assert
      const [first, second] = repository.tokens;
      expect(second.familyId).not.toBe(first.familyId);
    });
  });

  describe('rotate', () => {
    it('should return a new token for the same user', async () => {
      // Arrange
      const { refreshTokens } = createRefreshTokens();
      const { value } = await refreshTokens.issue('user-1');

      // Act
      const rotated = await refreshTokens.rotate(value);

      // Assert
      expect(rotated).toEqual({
        userId: 'user-1',
        refreshToken: { value: 'refresh-2', expiresAt: expect.any(Date) },
      });
    });

    it('should revoke the old token and link it to its replacement in the same family', async () => {
      // Arrange
      const { refreshTokens, repository } = createRefreshTokens();
      const { value } = await refreshTokens.issue('user-1');

      // Act
      await refreshTokens.rotate(value);

      // Assert
      const [old, replacement] = repository.tokens;
      expect(old.revokedAt).toEqual(NOW);
      expect(old.replacedById).toBe(replacement.id);
      expect(replacement.familyId).toBe(old.familyId);
    });

    it('should reject an unknown token', async () => {
      // Arrange
      const { refreshTokens } = createRefreshTokens();

      // Act
      const rotate = refreshTokens.rotate('never-issued');

      // Assert
      await expect(rotate).rejects.toThrow(InvalidRefreshTokenError);
    });

    it('should reject an expired token', async () => {
      // Arrange
      const { refreshTokens, clock } = createRefreshTokens();
      const { value } = await refreshTokens.issue('user-1');
      clock.advanceBy(REFRESH_TOKEN_TTL_MS);

      // Act
      const rotate = refreshTokens.rotate(value);

      // Assert
      await expect(rotate).rejects.toThrow(InvalidRefreshTokenError);
    });

    it('should reject a token that was already rotated', async () => {
      // Arrange
      const { refreshTokens } = createRefreshTokens();
      const { value } = await refreshTokens.issue('user-1');
      await refreshTokens.rotate(value);

      // Act
      const reuse = refreshTokens.rotate(value);

      // Assert
      await expect(reuse).rejects.toThrow(InvalidRefreshTokenError);
    });

    it('should revoke every token in the family when a rotated token is reused', async () => {
      // Arrange
      const { refreshTokens, repository } = createRefreshTokens();
      const { value } = await refreshTokens.issue('user-1');
      await refreshTokens.rotate(value);

      // Act
      await refreshTokens.rotate(value).catch(() => undefined);

      // Assert
      expect(repository.tokens.every(isRefreshTokenRevoked)).toBe(true);
    });

    it('should leave other families untouched when a token is reused', async () => {
      // Arrange
      const { refreshTokens, repository } = createRefreshTokens();
      const { value } = await refreshTokens.issue('user-1');
      await refreshTokens.issue('user-1');
      await refreshTokens.rotate(value);

      // Act
      await refreshTokens.rotate(value).catch(() => undefined);

      // Assert
      const otherFamily = repository.tokens[1];
      expect(isRefreshTokenRevoked(otherFamily)).toBe(false);
    });
  });

  describe('revoke', () => {
    it('should make the token unusable for a later refresh', async () => {
      // Arrange
      const { refreshTokens } = createRefreshTokens();
      const { value } = await refreshTokens.issue('user-1');

      // Act
      await refreshTokens.revoke(value);

      // Assert
      await expect(refreshTokens.rotate(value)).rejects.toThrow(
        InvalidRefreshTokenError,
      );
    });

    it('should ignore a token it does not know', async () => {
      // Arrange
      const { refreshTokens } = createRefreshTokens();

      // Act
      const revoke = refreshTokens.revoke('never-issued');

      // Assert
      await expect(revoke).resolves.toBeUndefined();
    });
  });
});
