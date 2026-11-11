import { ConfigService } from '@nestjs/config';
import {
  createJwtModuleOptions,
  loadAccessTokenConfig,
} from './access-token.config.js';

const SECRET = 'a'.repeat(32);

const configWith = (environment: Record<string, string>) =>
  new ConfigService(environment);

describe('loadAccessTokenConfig', () => {
  it('should read the secret and default the TTL to 15 minutes', () => {
    // Arrange
    const configService = configWith({ JWT_ACCESS_SECRET: SECRET });

    // Act
    const config = loadAccessTokenConfig(configService);

    // Assert
    expect(config).toEqual({ secret: SECRET, ttlSeconds: 900 });
  });

  it.each([
    ['30s', 30],
    ['15m', 900],
    ['1h', 3_600],
  ])('should convert a TTL of %s to %i seconds', (ttl, seconds) => {
    // Arrange
    const configService = configWith({
      JWT_ACCESS_SECRET: SECRET,
      JWT_ACCESS_TTL: ttl,
    });

    // Act
    const config = loadAccessTokenConfig(configService);

    // Assert
    expect(config.ttlSeconds).toBe(seconds);
  });

  it('should refuse to start without a secret', () => {
    // Arrange
    const configService = configWith({});

    // Act
    const load = () => loadAccessTokenConfig(configService);

    // Assert
    expect(load).toThrow(/JWT_ACCESS_SECRET must be at least 32 bytes/);
  });

  it('should refuse a secret shorter than 32 bytes', () => {
    // Arrange
    const configService = configWith({ JWT_ACCESS_SECRET: 'a'.repeat(31) });

    // Act
    const load = () => loadAccessTokenConfig(configService);

    // Assert
    expect(load).toThrow(/JWT_ACCESS_SECRET must be at least 32 bytes/);
  });

  it.each(['15', '15 minutes', '0m', '1d'])(
    'should refuse a malformed TTL of "%s"',
    (ttl) => {
      // Arrange
      const configService = configWith({
        JWT_ACCESS_SECRET: SECRET,
        JWT_ACCESS_TTL: ttl,
      });

      // Act
      const load = () => loadAccessTokenConfig(configService);

      // Assert
      expect(load).toThrow(/JWT_ACCESS_TTL must be/);
    },
  );
});

describe('createJwtModuleOptions', () => {
  it('should pin verification to HS256, numo-api and numo-web', () => {
    // Arrange
    const config = { secret: SECRET, ttlSeconds: 900 };

    // Act
    const options = createJwtModuleOptions(config);

    // Assert
    expect(options.verifyOptions).toEqual({
      algorithms: ['HS256'],
      issuer: 'numo-api',
      audience: 'numo-web',
    });
  });
});
