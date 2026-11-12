import type { AccessTokenIssuer } from '../domain/access-token.js';
import { InvalidRefreshTokenError } from '../domain/auth.errors.js';
import type { RefreshTokens } from './refresh-tokens.js';
import type { Session } from './session-issuer.js';

export class RefreshSessionUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokens,
    private readonly accessTokenIssuer: AccessTokenIssuer,
  ) {}

  async execute(presentedRefreshToken: string | undefined): Promise<Session> {
    if (!presentedRefreshToken) {
      throw new InvalidRefreshTokenError('No refresh token provided');
    }
    const { userId, refreshToken } = await this.refreshTokens.rotate(
      presentedRefreshToken,
    );
    const accessToken = await this.accessTokenIssuer.issue(userId);
    return {
      accessToken,
      refreshToken,
    };
  }
}
