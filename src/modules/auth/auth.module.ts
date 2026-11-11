import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { GetCurrentUserUseCase } from './application/get-current-user.use-case.js';
import { LoginUseCase } from './application/login.use-case.js';
import { RegisterUserUseCase } from './application/register-user.use-case.js';
import {
  ACCESS_TOKEN_ISSUER,
  ACCESS_TOKEN_VERIFIER,
  type AccessTokenIssuer,
} from './domain/access-token.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from './domain/password-hasher.js';
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
import { JwtAccessTokenService } from './infrastructure/jwt-access-token.service.js';
import { PgUserRepository } from './infrastructure/pg-user-repository.js';
import { AuthController } from './presentation/auth.controller.js';
import { JwtAuthGuard } from './presentation/jwt-auth.guard.js';

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
  ],
  controllers: [AuthController],
  providers: [
    accessTokenConfigProvider,
    { provide: USER_REPOSITORY, useClass: PgUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    JwtAccessTokenService,
    { provide: ACCESS_TOKEN_ISSUER, useExisting: JwtAccessTokenService },
    { provide: ACCESS_TOKEN_VERIFIER, useExisting: JwtAccessTokenService },
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
      inject: [USER_REPOSITORY, PASSWORD_HASHER, ACCESS_TOKEN_ISSUER],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        accessTokenIssuer: AccessTokenIssuer,
      ) => new LoginUseCase(userRepository, passwordHasher, accessTokenIssuer),
    },
    {
      provide: GetCurrentUserUseCase,
      inject: [USER_REPOSITORY],
      useFactory: (userRepository: UserRepository) =>
        new GetCurrentUserUseCase(userRepository),
    },
    // Global: every route of every module needs a valid token unless @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
