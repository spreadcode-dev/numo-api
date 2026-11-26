import { Module } from '@nestjs/common';
import { DeleteTransactionUseCase } from './application/delete-transaction.use-case.js';
import { ListTransactionsUseCase } from './application/list-transactions.use-case.js';
import { RecordTransactionUseCase } from './application/record-transaction.use-case.js';
import { ReplaceTransactionUseCase } from './application/replace-transaction.use-case.js';
import {
  TRANSACTION_READER,
  type TransactionReader,
} from './application/transaction-reader.js';
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
    PgTransactionRepository,
    // One pg adapter serves both the write port and the read (query) port.
    { provide: TRANSACTION_REPOSITORY, useExisting: PgTransactionRepository },
    { provide: TRANSACTION_READER, useExisting: PgTransactionRepository },
    { provide: ACCOUNT_LOOKUP, useClass: PgAccountLookup },
    {
      provide: RecordTransactionUseCase,
      inject: [TRANSACTION_REPOSITORY, ACCOUNT_LOOKUP],
      useFactory: (
        transactionRepository: TransactionRepository,
        accountLookup: AccountLookup,
      ) => new RecordTransactionUseCase(transactionRepository, accountLookup),
    },
    {
      provide: ListTransactionsUseCase,
      inject: [TRANSACTION_READER],
      useFactory: (transactionReader: TransactionReader) =>
        new ListTransactionsUseCase(transactionReader),
    },
    {
      provide: ReplaceTransactionUseCase,
      inject: [TRANSACTION_REPOSITORY, ACCOUNT_LOOKUP],
      useFactory: (
        transactionRepository: TransactionRepository,
        accountLookup: AccountLookup,
      ) => new ReplaceTransactionUseCase(transactionRepository, accountLookup),
    },
    {
      provide: DeleteTransactionUseCase,
      inject: [TRANSACTION_REPOSITORY],
      useFactory: (transactionRepository: TransactionRepository) =>
        new DeleteTransactionUseCase(transactionRepository),
    },
  ],
})
export class TransactionsModule {}
