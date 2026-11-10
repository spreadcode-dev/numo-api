import { Module } from '@nestjs/common';
import { RegisterUserUseCase } from './application/register-user.use-case.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from './domain/password-hasher.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './domain/user-repository.js';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js';
import { PgUserRepository } from './infrastructure/pg-user-repository.js';
import { AuthController } from './presentation/auth.controller.js';

@Module({
  controllers: [AuthController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PgUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    {
      provide: RegisterUserUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
      ) => new RegisterUserUseCase(userRepository, passwordHasher),
    },
  ],
})
export class AuthModule {}
