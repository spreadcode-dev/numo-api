import { InvalidRefreshTokenError } from '../domain/auth.errors.js';
import type { Clock } from '../domain/clock.js';
import {
  calculateRefreshTokenExpiry,
  isRefreshTokenExpired,
  isRefreshTokenRevoked,
  type RefreshToken,
} from '../domain/refresh-token.js';
import type { RefreshTokenGenerator } from '../domain/refresh-token-generator.js';
import type { RefreshTokenRepository } from '../domain/refresh-token-repository.js';

export type IssuedRefreshToken = {
  value: string;
  expiresAt: Date;
};

export type RotatedRefreshToken = {
  userId: string;
  refreshToken: IssuedRefreshToken;
};

type PendingRefreshToken = IssuedRefreshToken & {
  tokenHash: string;
};

const toIssued = (pending: PendingRefreshToken): IssuedRefreshToken => ({
  value: pending.value,
  expiresAt: pending.expiresAt,
});

export class RefreshTokens {
  constructor(
    private readonly repository: RefreshTokenRepository,
    private readonly generator: RefreshTokenGenerator,
    private readonly clock: Clock,
  ) {}

  async issue(userId: string): Promise<IssuedRefreshToken> {
    const pending = this.generate();
    await this.repository.create({
      userId,
      tokenHash: pending.tokenHash,
      expiresAt: pending.expiresAt,
    });
    return toIssued(pending);
  }

  async rotate(presentedValue: string): Promise<RotatedRefreshToken> {
    const current = await this.findUsable(presentedValue);
    const pending = this.generate();
    await this.repository.rotate(current.id, {
      tokenHash: pending.tokenHash,
      expiresAt: pending.expiresAt,
    });
    return {
      userId: current.userId,
      refreshToken: toIssued(pending),
    };
  }

  async revoke(presentedValue: string): Promise<void> {
    const token = await this.findByValue(presentedValue);
    if (token) {
      await this.repository.revoke(token.id);
    }
  }

  private async findUsable(presentedValue: string): Promise<RefreshToken> {
    const token = await this.findByValue(presentedValue);
    if (!token) {
      throw new InvalidRefreshTokenError();
    }
    if (isRefreshTokenRevoked(token)) {
      // A revoked token coming back means someone kept a copy: end the session everywhere.
      await this.repository.revokeFamily(token.familyId);
      throw new InvalidRefreshTokenError();
    }
    if (isRefreshTokenExpired(token, this.clock.now())) {
      throw new InvalidRefreshTokenError();
    }
    return token;
  }

  private findByValue(
    presentedValue: string,
  ): Promise<RefreshToken | undefined> {
    const tokenHash = this.generator.hash(presentedValue);
    return this.repository.findByHash(tokenHash);
  }

  private generate(): PendingRefreshToken {
    const { value, hash } = this.generator.generate();
    const expiresAt = calculateRefreshTokenExpiry(this.clock.now());
    return { value, tokenHash: hash, expiresAt };
  }
}
