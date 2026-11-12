import { InvalidRefreshTokenError } from '../domain/auth.errors.js';
import { LogoutUseCase } from './logout.use-case.js';
import { createInMemoryRefreshTokens } from './testing/refresh-tokens.fake.js';

describe('LogoutUseCase', () => {
  it('should make the refresh token unusable', async () => {
    // Arrange
    const { refreshTokens } = createInMemoryRefreshTokens();
    const { value } = await refreshTokens.issue('user-1');
    const useCase = new LogoutUseCase(refreshTokens);

    // Act
    await useCase.execute(value);

    // Assert
    await expect(refreshTokens.rotate(value)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it('should succeed without a refresh token and change nothing', async () => {
    // Arrange
    const { refreshTokens, repository } = createInMemoryRefreshTokens();
    await refreshTokens.issue('user-1');
    const useCase = new LogoutUseCase(refreshTokens);

    // Act
    await useCase.execute(undefined);

    // Assert
    expect(repository.tokens.some((token) => token.revokedAt)).toBe(false);
  });
});
