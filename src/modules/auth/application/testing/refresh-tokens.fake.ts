import { RefreshTokens } from '../refresh-tokens.js';
import { FakeClock } from './clock.fake.js';
import { FakeRefreshTokenGenerator } from './refresh-token-generator.fake.js';
import { InMemoryRefreshTokenRepository } from './refresh-token-repository.fake.js';

export const FAKE_NOW = new Date('2026-11-10T12:00:00Z');

export const createInMemoryRefreshTokens = () => {
  const clock = new FakeClock(FAKE_NOW);
  const repository = new InMemoryRefreshTokenRepository(clock);
  const refreshTokens = new RefreshTokens(
    repository,
    new FakeRefreshTokenGenerator(),
    clock,
  );
  return { refreshTokens, repository, clock };
};
