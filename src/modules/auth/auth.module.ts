import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { GetCurrentUserUseCase } from './application/get-current-user.use-case.js';
import { LoginUseCase } from './application/login.use-case.js';
import { LogoutUseCase } from './application/logout.use-case.js';
import { RefreshSessionUseCase } from './application/refresh-session.use-case.js';
import { RefreshTokens } from './application/refresh-tokens.js';
import { RegisterUserUseCase } from './application/register-user.use-case.js';
import { SessionIssuer } from './application/session-issuer.js';
import {
  ACCESS_TOKEN_ISSUER,
  ACCESS_TOKEN_VERIFIER,
  type AccessTokenIssuer,
} from './domain/access-token.js';
import { CLOCK, type Clock } from './domain/clock.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from './domain/password-hasher.js';
import {
  REFRESH_TOKEN_GENERATOR,
  type RefreshTokenGenerator,
} from './domain/refresh-token-generator.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from './domain/refresh-token-repository.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './domain/user-repository.js';
import {
  ACCESS_TOKEN_CONFIG,
  createJwtModuleOptions,
  loadAccessTokenConfig,
} from './infrastructure/access-token.config.js';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js';
import { CryptoRefreshTokenGenerator } from './infrastructure/crypto-refresh-token-generator.js';
import { JwtAccessTokenService } from './infrastructure/jwt-access-token.service.js';
import { PgRefreshTokenRepository } from './infrastructure/pg-refresh-token-repository.js';
import { PgUserRepository } from './infrastructure/pg-user-repository.js';
import { SystemClock } from './infrastructure/system-clock.js';
import { AuthController } from './presentation/auth.controller.js';
import { loadAuthRateLimitOptions } from './presentation/auth-rate-limit.config.js';
import { JwtAuthGuard } from './presentation/jwt-auth.guard.js';
import { SessionController } from './presentation/session.controller.js';

// Loaded once at startup: a missing or short JWT_ACCESS_SECRET stops the app here.
const accessTokenConfigProvider: Provider = {
  provide: ACCESS_TOKEN_CONFIG,
  inject: [ConfigService],
  useFactory: loadAccessTokenConfig,
};

@Module({
  imports: [
    JwtModule.registerAsync({
      extraProviders: [accessTokenConfigProvider],
      inject: [ACCESS_TOKEN_CONFIG],
      useFactory: createJwtModuleOptions,
    }),
    // In-memory counters: enough for one local instance. Several instances
    // would need a shared store (e.g. Redis) so they see the same counts.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: loadAuthRateLimitOptions,
    }),
  ],
  controllers: [AuthController, SessionController],
  providers: [
    accessTokenConfigProvider,
    { provide: USER_REPOSITORY, useClass: PgUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    JwtAccessTokenService,
    { provide: ACCESS_TOKEN_ISSUER, useExisting: JwtAccessTokenService },
    { provide: ACCESS_TOKEN_VERIFIER, useExisting: JwtAccessTokenService },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PgRefreshTokenRepository },
    { provide: REFRESH_TOKEN_GENERATOR, useClass: CryptoRefreshTokenGenerator },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: RefreshTokens,
      inject: [REFRESH_TOKEN_REPOSITORY, REFRESH_TOKEN_GENERATOR, CLOCK],
      useFactory: (
        repository: RefreshTokenRepository,
        generator: RefreshTokenGenerator,
        clock: Clock,
      ) => new RefreshTokens(repository, generator, clock),
    },
    {
      provide: RegisterUserUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
      ) => new RegisterUserUseCase(userRepository, passwordHasher),
    },
    {
      provide: LoginUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, SessionIssuer],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        sessionIssuer: SessionIssuer,
      ) => new LoginUseCase(userRepository, passwordHasher, sessionIssuer),
    },
    {
      provide: GetCurrentUserUseCase,
      inject: [USER_REPOSITORY],
      useFactory: (userRepository: UserRepository) =>
        new GetCurrentUserUseCase(userRepository),
    },
    {
      provide: RefreshSessionUseCase,
      inject: [RefreshTokens, ACCESS_TOKEN_ISSUER],
      useFactory: (
        refreshTokens: RefreshTokens,
        accessTokenIssuer: AccessTokenIssuer,
      ) => new RefreshSessionUseCase(refreshTokens, accessTokenIssuer),
    },
    {
      provide: SessionIssuer,
      inject: [ACCESS_TOKEN_ISSUER, RefreshTokens],
      useFactory: (
        accessTokenIssuer: AccessTokenIssuer,
        refreshTokens: RefreshTokens,
      ) => new SessionIssuer(accessTokenIssuer, refreshTokens),
    },
    {
      provide: LogoutUseCase,
      inject: [RefreshTokens],
      useFactory: (refreshTokens: RefreshTokens) =>
        new LogoutUseCase(refreshTokens),
    },
    // Global: every route of every module needs a valid token unless @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
