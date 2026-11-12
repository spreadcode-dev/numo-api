import { InvalidRefreshTokenError } from '../domain/auth.errors.js';
import { RefreshSessionUseCase } from './refresh-session.use-case.js';
import { FakeAccessTokenIssuer } from './testing/access-token-issuer.fake.js';
import { createInMemoryRefreshTokens } from './testing/refresh-tokens.fake.js';

const createUseCase = () => {
  const { refreshTokens } = createInMemoryRefreshTokens();
  const useCase = new RefreshSessionUseCase(
    refreshTokens,
    new FakeAccessTokenIssuer(),
  );
  return { useCase, refreshTokens };
};

describe('RefreshSessionUseCase', () => {
  it('should return a new access token and a rotated refresh token', async () => {
    // Arrange
    const { useCase, refreshTokens } = createUseCase();
    const { value } = await refreshTokens.issue('user-1');

    // Act
    const session = await useCase.execute(value);

    // Assert
    expect(session).toEqual({
      accessToken: { value: 'token-for:user-1', expiresInSeconds: 900 },
      refreshToken: { value: 'refresh-2', expiresAt: expect.any(Date) },
    });
  });

  it('should reject a missing refresh token', async () => {
    // Arrange
    const { useCase } = createUseCase();

    // Act
    const refresh = useCase.execute(undefined);

    // Assert
    await expect(refresh).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('should reject a refresh token that was already rotated', async () => {
    // Arrange
    const { useCase, refreshTokens } = createUseCase();
    const { value } = await refreshTokens.issue('user-1');
    await useCase.execute(value);

    // Act
    const reuse = useCase.execute(value);

    // Assert
    await expect(reuse).rejects.toThrow(InvalidRefreshTokenError);
  });
});
