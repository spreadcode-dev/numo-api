import { Module } from '@nestjs/common';
import { DeleteTransactionUseCase } from './application/delete-transaction.use-case.js';
import { ListTransactionsUseCase } from './application/list-transactions.use-case.js';
import { RecordTransactionUseCase } from './application/record-transaction.use-case.js';
import { ReplaceTransactionUseCase } from './application/replace-transaction.use-case.js';
import { SetTransactionLabelsUseCase } from './application/set-transaction-labels.use-case.js';
import {
  TRANSACTION_READER,
  type TransactionReader,
} from './application/transaction-reader.js';
import { ACCOUNT_LOOKUP, type AccountLookup } from './domain/account-lookup.js';
import { LABEL_LOOKUP, type LabelLookup } from './domain/label-lookup.js';
import {
  TRANSACTION_LABEL_REPOSITORY,
  type TransactionLabelRepository,
} from './domain/transaction-label-repository.js';
import {
  TRANSACTION_REPOSITORY,
  type TransactionRepository,
} from './domain/transaction-repository.js';
import { PgAccountLookup } from './infrastructure/pg-account-lookup.js';
import { PgLabelLookup } from './infrastructure/pg-label-lookup.js';
import { PgTransactionLabelRepository } from './infrastructure/pg-transaction-label-repository.js';
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
    { provide: LABEL_LOOKUP, useClass: PgLabelLookup },
    {
      provide: TRANSACTION_LABEL_REPOSITORY,
      useClass: PgTransactionLabelRepository,
    },
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
      inject: [TRANSACTION_READER, TRANSACTION_LABEL_REPOSITORY],
      useFactory: (
        transactionReader: TransactionReader,
        transactionLabelRepository: TransactionLabelRepository,
      ) =>
        new ListTransactionsUseCase(
          transactionReader,
          transactionLabelRepository,
        ),
    },
    {
      provide: ReplaceTransactionUseCase,
      inject: [
        TRANSACTION_REPOSITORY,
        ACCOUNT_LOOKUP,
        TRANSACTION_LABEL_REPOSITORY,
      ],
      useFactory: (
        transactionRepository: TransactionRepository,
        accountLookup: AccountLookup,
        transactionLabelRepository: TransactionLabelRepository,
      ) =>
        new ReplaceTransactionUseCase(
          transactionRepository,
          accountLookup,
          transactionLabelRepository,
        ),
    },
    {
      provide: SetTransactionLabelsUseCase,
      inject: [
        TRANSACTION_REPOSITORY,
        LABEL_LOOKUP,
        TRANSACTION_LABEL_REPOSITORY,
      ],
      useFactory: (
        transactionRepository: TransactionRepository,
        labelLookup: LabelLookup,
        transactionLabelRepository: TransactionLabelRepository,
      ) =>
        new SetTransactionLabelsUseCase(
          transactionRepository,
          labelLookup,
          transactionLabelRepository,
        ),
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
