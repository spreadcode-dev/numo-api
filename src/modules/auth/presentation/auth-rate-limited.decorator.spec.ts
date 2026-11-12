import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { DATABASE_HEALTH_INDICATOR } from '../../health/application/database-health-indicator.js';
import { HealthController } from '../../health/presentation/health.controller.js';
import { GetCurrentUserUseCase } from '../application/get-current-user.use-case.js';
import { LoginUseCase } from '../application/login.use-case.js';
import { LogoutUseCase } from '../application/logout.use-case.js';
import { RefreshSessionUseCase } from '../application/refresh-session.use-case.js';
import { RegisterUserUseCase } from '../application/register-user.use-case.js';
import { ACCESS_TOKEN_VERIFIER } from '../domain/access-token.js';
import { InvalidCredentialsError } from '../domain/auth.errors.js';
import { AuthController } from './auth.controller.js';
import { loadAuthRateLimitOptions } from './auth-rate-limit.config.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { SessionController } from './session.controller.js';

const DEFAULT_LIMIT = 5;
const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';
const CREDENTIALS = JSON.stringify({
  email: 'ana@example.com',
  password: 'correct-horse-battery',
});

type Reply = { status: number; retryAfter: string | undefined };

const fakeUseCase = (execute: () => Promise<unknown>) => ({ execute });

const startApp = async (): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ThrottlerModule.forRoot(loadAuthRateLimitOptions(new ConfigService({}))),
    ],
    controllers: [AuthController, SessionController, HealthController],
    providers: [
      {
        provide: LoginUseCase,
        useValue: fakeUseCase(() =>
          Promise.reject(new InvalidCredentialsError()),
        ),
      },
      {
        provide: RegisterUserUseCase,
        useValue: fakeUseCase(() =>
          Promise.resolve({ id: USER_ID, email: 'ana@example.com' }),
        ),
      },
      {
        provide: GetCurrentUserUseCase,
        useValue: fakeUseCase(() =>
          Promise.resolve({ id: USER_ID, email: 'ana@example.com' }),
        ),
      },
      { provide: RefreshSessionUseCase, useValue: fakeUseCase(vi.fn()) },
      { provide: LogoutUseCase, useValue: fakeUseCase(vi.fn()) },
      {
        provide: ACCESS_TOKEN_VERIFIER,
        useValue: { verify: () => Promise.resolve({ userId: USER_ID }) },
      },
      {
        provide: DATABASE_HEALTH_INDICATOR,
        useValue: { isUp: () => Promise.resolve(true) },
      },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
    ],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.listen(0, '127.0.0.1');
  return app;
};

const toReply = async (response: Response): Promise<Reply> => {
  // Drain the body so the connection is released before app.close().
  await response.arrayBuffer();
  return {
    status: response.status,
    retryAfter: response.headers.get('retry-after') ?? undefined,
  };
};

// Sequential on purpose: the limit is about how many calls came before.
const callRepeatedly = async (
  times: number,
  call: () => Promise<Response>,
): Promise<Reply[]> => {
  const replies: Reply[] = [];
  for (let attempt = 0; attempt < times; attempt++) {
    replies.push(await toReply(await call()));
  }
  return replies;
};

describe('@AuthRateLimited()', () => {
  let app: INestApplication;
  let baseUrl: string;

  const post = (path: string) =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: CREDENTIALS,
    });

  const get = (path: string) =>
    fetch(`${baseUrl}${path}`, {
      headers: { Authorization: 'Bearer any-token' },
    });

  beforeEach(async () => {
    app = await startApp();
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should answer 429 with Retry-After on the 6th login within a minute', async () => {
    // Arrange
    const attempts = DEFAULT_LIMIT + 1;

    // Act
    const replies = await callRepeatedly(attempts, () => post('/auth/login'));

    // Assert
    expect(replies.map((reply) => reply.status)).toEqual([
      401, 401, 401, 401, 401, 429,
    ]);
    expect(Number(replies.at(-1)?.retryAfter)).toBeGreaterThan(0);
  });

  it('should answer 429 with Retry-After on the 6th registration within a minute', async () => {
    // Arrange
    const attempts = DEFAULT_LIMIT + 1;

    // Act
    const replies = await callRepeatedly(attempts, () =>
      post('/auth/register'),
    );

    // Assert
    expect(replies.map((reply) => reply.status)).toEqual([
      201, 201, 201, 201, 201, 429,
    ]);
    expect(Number(replies.at(-1)?.retryAfter)).toBeGreaterThan(0);
  });

  it('should count login and registration separately', async () => {
    // Arrange
    await callRepeatedly(DEFAULT_LIMIT, () => post('/auth/login'));

    // Act
    const [registration] = await callRepeatedly(1, () =>
      post('/auth/register'),
    );

    // Assert
    expect(registration.status).toBe(201);
  });

  it.each(['/health', '/auth/me'])(
    'should never limit GET %s',
    async (path) => {
      // Arrange
      const attempts = DEFAULT_LIMIT * 2;

      // Act
      const replies = await callRepeatedly(attempts, () => get(path));

      // Assert
      expect(replies.every((reply) => reply.status === 200)).toBe(true);
    },
  );
});
