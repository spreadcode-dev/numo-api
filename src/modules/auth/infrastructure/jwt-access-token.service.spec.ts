import { JwtService } from '@nestjs/jwt';
import { InvalidAccessTokenError } from '../domain/auth.errors.js';
import {
  type AccessTokenConfig,
  createJwtModuleOptions,
} from './access-token.config.js';
import { JwtAccessTokenService } from './jwt-access-token.service.js';

const CONFIG: AccessTokenConfig = { secret: 'a'.repeat(32), ttlSeconds: 900 };
const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';

const serviceWith = (config: AccessTokenConfig) =>
  new JwtAccessTokenService(
    new JwtService(createJwtModuleOptions(config)),
    config,
  );

const decodePart = (token: string, index: number): Record<string, unknown> =>
  JSON.parse(
    Buffer.from(token.split('.')[index], 'base64url').toString(),
  ) as Record<string, unknown>;

const encodePart = (part: object): string =>
  Buffer.from(JSON.stringify(part)).toString('base64url');

describe('JwtAccessTokenService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should issue an HS256 token for the user, from numo-api to numo-web', async () => {
    // Arrange
    const service = serviceWith(CONFIG);

    // Act
    const accessToken = await service.issue(USER_ID);

    // Assert
    expect(decodePart(accessToken.value, 0)).toMatchObject({ alg: 'HS256' });
    expect(decodePart(accessToken.value, 1)).toMatchObject({
      sub: USER_ID,
      iss: 'numo-api',
      aud: 'numo-web',
    });
  });

  it('should make the token expire after the configured TTL', async () => {
    // Arrange
    const service = serviceWith(CONFIG);

    // Act
    const accessToken = await service.issue(USER_ID);

    // Assert
    const { iat, exp } = decodePart(accessToken.value, 1);
    expect(Number(exp) - Number(iat)).toBe(900);
    expect(accessToken.expiresInSeconds).toBe(900);
  });

  it('should return the user id of a token it issued', async () => {
    // Arrange
    const service = serviceWith(CONFIG);
    const { value } = await service.issue(USER_ID);

    // Act
    const claims = await service.verify(value);

    // Assert
    expect(claims).toEqual({ userId: USER_ID });
  });

  it('should reject an expired token', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['Date'] });
    const service = serviceWith(CONFIG);
    const { value } = await service.issue(USER_ID);
    vi.setSystemTime(Date.now() + (CONFIG.ttlSeconds + 1) * 1_000);

    // Act
    const verify = service.verify(value);

    // Assert
    await expect(verify).rejects.toThrow(InvalidAccessTokenError);
  });

  it('should reject a token whose payload was tampered with', async () => {
    // Arrange
    const service = serviceWith(CONFIG);
    const { value } = await service.issue(USER_ID);
    const [header, payload, signature] = value.split('.');
    const forgedPayload = encodePart({
      ...decodePart(value, 1),
      sub: 'someone-else',
    });

    // Act
    const verify = service.verify(`${header}.${forgedPayload}.${signature}`);

    // Assert
    expect(forgedPayload).not.toBe(payload);
    await expect(verify).rejects.toThrow(InvalidAccessTokenError);
  });

  it('should reject an unsigned token (alg: none)', async () => {
    // Arrange
    const service = serviceWith(CONFIG);
    const { value } = await service.issue(USER_ID);
    const [, payload] = value.split('.');
    const unsignedHeader = encodePart({ alg: 'none', typ: 'JWT' });

    // Act
    const verify = service.verify(`${unsignedHeader}.${payload}.`);

    // Assert
    await expect(verify).rejects.toThrow(InvalidAccessTokenError);
  });

  it('should reject a token signed with another secret', async () => {
    // Arrange
    const otherService = serviceWith({ ...CONFIG, secret: 'b'.repeat(32) });
    const { value } = await otherService.issue(USER_ID);

    // Act
    const verify = serviceWith(CONFIG).verify(value);

    // Assert
    await expect(verify).rejects.toThrow(InvalidAccessTokenError);
  });

  it('should reject a token meant for another audience', async () => {
    // Arrange
    const value = new JwtService().sign(
      { sub: USER_ID },
      {
        secret: CONFIG.secret,
        algorithm: 'HS256',
        issuer: 'numo-api',
        audience: 'another-app',
        expiresIn: 900,
      },
    );

    // Act
    const verify = serviceWith(CONFIG).verify(value);

    // Assert
    await expect(verify).rejects.toThrow(InvalidAccessTokenError);
  });
});
