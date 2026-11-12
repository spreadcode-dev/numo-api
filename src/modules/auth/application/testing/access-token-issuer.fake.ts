import type {
  AccessToken,
  AccessTokenIssuer,
} from '../../domain/access-token.js';

export class FakeAccessTokenIssuer implements AccessTokenIssuer {
  issue(userId: string): Promise<AccessToken> {
    return Promise.resolve({
      value: `token-for:${userId}`,
      expiresInSeconds: 900,
    });
  }
}
