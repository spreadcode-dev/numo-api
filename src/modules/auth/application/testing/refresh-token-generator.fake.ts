import type {
  GeneratedRefreshToken,
  RefreshTokenGenerator,
} from '../../domain/refresh-token-generator.js';

export class FakeRefreshTokenGenerator implements RefreshTokenGenerator {
  private generatedCount = 0;

  generate(): GeneratedRefreshToken {
    this.generatedCount++;
    const value = `refresh-${this.generatedCount}`;
    const hash = this.hash(value);
    return { value, hash };
  }

  hash(value: string): string {
    return `hashed:${value}`;
  }
}
