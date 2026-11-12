import type { AccessToken, AccessTokenIssuer } from '../domain/access-token.js';
import type { IssuedRefreshToken, RefreshTokens } from './refresh-tokens.js';

export type Session = {
  accessToken: AccessToken;
  refreshToken: IssuedRefreshToken;
};

export class SessionIssuer {
  constructor(
    private readonly accessTokenIssuer: AccessTokenIssuer,
    private readonly refreshTokens: RefreshTokens,
  ) {}

  async start(userId: string): Promise<Session> {
    const accessToken = await this.accessTokenIssuer.issue(userId);
    const refreshToken = await this.refreshTokens.issue(userId);
    return { accessToken, refreshToken };
  }
}
