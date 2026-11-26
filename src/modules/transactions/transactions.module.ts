import { Module } from '@nestjs/common';
import { RecordTransactionUseCase } from './application/record-transaction.use-case.js';
import { ACCOUNT_LOOKUP, type AccountLookup } from './domain/account-lookup.js';
import {
  TRANSACTION_REPOSITORY,
  type TransactionRepository,
} from './domain/transaction-repository.js';
import { PgAccountLookup } from './infrastructure/pg-account-lookup.js';
import { PgTransactionRepository } from './infrastructure/pg-transaction-repository.js';
import { TransactionsController } from './presentation/transactions.controller.js';

@Module({
  controllers: [TransactionsController],
  providers: [
    { provide: TRANSACTION_REPOSITORY, useClass: PgTransactionRepository },
    { provide: ACCOUNT_LOOKUP, useClass: PgAccountLookup },
    {
      provide: RecordTransactionUseCase,
      inject: [TRANSACTION_REPOSITORY, ACCOUNT_LOOKUP],
      useFactory: (
        transactionRepository: TransactionRepository,
        accountLookup: AccountLookup,
      ) => new RecordTransactionUseCase(transactionRepository, accountLookup),
    },
  ],
})
export class TransactionsModule {}
