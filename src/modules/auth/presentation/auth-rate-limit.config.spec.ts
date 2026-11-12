import { ConfigService } from '@nestjs/config';
import { loadAuthRateLimitOptions } from './auth-rate-limit.config.js';

const configWith = (environment: Record<string, string>) =>
  new ConfigService(environment);

describe('loadAuthRateLimitOptions', () => {
  it('should default to 5 requests per minute', () => {
    // Arrange
    const configService = configWith({});

    // Act
    const options = loadAuthRateLimitOptions(configService);

    // Assert
    expect(options).toEqual([{ limit: 5, ttl: 60_000 }]);
  });

  it('should read the limit and window from the environment', () => {
    // Arrange
    const configService = configWith({
      AUTH_THROTTLE_LIMIT: '10',
      AUTH_THROTTLE_TTL: '30s',
    });

    // Act
    const options = loadAuthRateLimitOptions(configService);

    // Assert
    expect(options).toEqual([{ limit: 10, ttl: 30_000 }]);
  });

  it.each(['0', '-1', 'abc', '1.5', ''])(
    'should refuse to start with a limit of "%s"',
    (limit) => {
      // Arrange
      const configService = configWith({ AUTH_THROTTLE_LIMIT: limit });

      // Act
      const load = () => loadAuthRateLimitOptions(configService);

      // Assert
      expect(load).toThrow(
        /AUTH_THROTTLE_LIMIT must be a positive whole number/,
      );
    },
  );

  it('should refuse to start with a malformed window', () => {
    // Arrange
    const configService = configWith({ AUTH_THROTTLE_TTL: '1d' });

    // Act
    const load = () => loadAuthRateLimitOptions(configService);

    // Assert
    expect(load).toThrow(/AUTH_THROTTLE_TTL must be/);
  });
});
