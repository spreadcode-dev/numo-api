import { Module } from '@nestjs/common';
import { CreateAccountUseCase } from './application/create-account.use-case.js';
import { ListAccountsUseCase } from './application/list-accounts.use-case.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from './domain/account-repository.js';
import { PgAccountRepository } from './infrastructure/pg-account-repository.js';
import { AccountsController } from './presentation/accounts.controller.js';

@Module({
  controllers: [AccountsController],
  providers: [
    { provide: ACCOUNT_REPOSITORY, useClass: PgAccountRepository },
    {
      provide: CreateAccountUseCase,
      inject: [ACCOUNT_REPOSITORY],
      useFactory: (accountRepository: AccountRepository) =>
        new CreateAccountUseCase(accountRepository),
    },
    {
      provide: ListAccountsUseCase,
      inject: [ACCOUNT_REPOSITORY],
      useFactory: (accountRepository: AccountRepository) =>
        new ListAccountsUseCase(accountRepository),
    },
  ],
})
export class AccountsModule {}
