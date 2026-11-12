import type { RefreshTokens } from './refresh-tokens.js';

export class LogoutUseCase {
  constructor(private readonly refreshTokens: RefreshTokens) {}

  async execute(presentedRefreshToken: string | undefined): Promise<void> {
    if (!presentedRefreshToken) {
      return;
    }
    await this.refreshTokens.revoke(presentedRefreshToken);
  }
}
