import { SessionIssuer } from './session-issuer.js';
import { FakeAccessTokenIssuer } from './testing/access-token-issuer.fake.js';
import { createInMemoryRefreshTokens } from './testing/refresh-tokens.fake.js';

describe('SessionIssuer', () => {
  it('should issue an access token and a refresh token for the user', async () => {
    // Arrange
    const { refreshTokens } = createInMemoryRefreshTokens();
    const sessionIssuer = new SessionIssuer(
      new FakeAccessTokenIssuer(),
      refreshTokens,
    );

    // Act
    const session = await sessionIssuer.start('user-1');

    // Assert
    expect(session).toEqual({
      accessToken: { value: 'token-for:user-1', expiresInSeconds: 900 },
      refreshToken: {
        value: 'refresh-1',
        expiresAt: new Date('2026-11-17T12:00:00Z'),
      },
    });
  });
});
