import { InvalidRefreshTokenError } from '../../domain/auth.errors.js';
import type { Clock } from '../../domain/clock.js';
import {
  isRefreshTokenRevoked,
  type RefreshToken,
} from '../../domain/refresh-token.js';
import type {
  NewRefreshToken,
  RefreshTokenReplacement,
  RefreshTokenRepository,
} from '../../domain/refresh-token-repository.js';

type StoredFields = Omit<RefreshToken, 'id' | 'createdAt'>;

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly tokens: RefreshToken[] = [];

  constructor(private readonly clock: Clock) {}

  create(newRefreshToken: NewRefreshToken): Promise<void> {
    this.store({
      ...newRefreshToken,
      familyId: `family-${this.tokens.length + 1}`,
    });
    return Promise.resolve();
  }

  findByHash(tokenHash: string): Promise<RefreshToken | undefined> {
    const token = this.tokens.find((t) => t.tokenHash === tokenHash);
    return Promise.resolve(token);
  }

  rotate(
    currentId: string,
    replacement: RefreshTokenReplacement,
  ): Promise<void> {
    const current = this.findActiveById(currentId);
    if (!current) {
      return Promise.reject(new InvalidRefreshTokenError());
    }

    const stored = this.store({
      ...replacement,
      userId: current.userId,
      familyId: current.familyId,
    });
    current.revokedAt = this.clock.now();
    current.replacedById = stored.id;
    return Promise.resolve();
  }

  revoke(id: string): Promise<void> {
    const token = this.findActiveById(id);
    if (token) {
      token.revokedAt = this.clock.now();
    }
    return Promise.resolve();
  }

  revokeFamily(familyId: string): Promise<void> {
    this.tokens
      .filter((t) => t.familyId === familyId && !isRefreshTokenRevoked(t))
      .forEach((t) => {
        t.revokedAt = this.clock.now();
      });
    return Promise.resolve();
  }

  private findActiveById(id: string): RefreshToken | undefined {
    return this.tokens.find((t) => t.id === id && !isRefreshTokenRevoked(t));
  }

  private store(fields: StoredFields): RefreshToken {
    const token: RefreshToken = {
      id: `token-${this.tokens.length + 1}`,
      ...fields,
      createdAt: this.clock.now(),
    };
    this.tokens.push(token);
    return token;
  }
}
