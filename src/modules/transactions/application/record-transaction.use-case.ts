import type { AccountLookup } from '../domain/account-lookup.js';
import { toTransactionAmount } from '../domain/transaction-amount.js';
import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import type { TransactionRepository } from '../domain/transaction-repository.js';
import {
  TransactionAccountArchivedError,
  TransactionAccountNotFoundError,
} from '../domain/transactions.errors.js';
import { type TransactionView, toTransactionView } from './transaction-view.js';

export type RecordTransactionCommand = {
  userId: string;
  accountId: string;
  date: string;
  amount: number;
  description: string;
};

export class RecordTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountLookup: AccountLookup,
  ) {}

  async execute(command: RecordTransactionCommand): Promise<TransactionView> {
    const date = TransactionDate.create(command.date);
    const amount = toTransactionAmount(command.amount);
    const description = TransactionDescription.create(command.description);
    await this.ensureAccountAcceptsTransactions(command);

    const transaction = await this.transactionRepository.create({
      userId: command.userId,
      accountId: command.accountId,
      date,
      amount,
      description,
    });
    return toTransactionView(transaction);
  }

  // Another user's account and an unknown id fail the same way, so a 404 never
  // confirms that someone else's account exists.
  private async ensureAccountAcceptsTransactions(
    command: RecordTransactionCommand,
  ): Promise<void> {
    const account = await this.accountLookup.findOwnedAccount(
      command.userId,
      command.accountId,
    );
    if (!account) {
      throw new TransactionAccountNotFoundError();
    }
    if (account.isArchived) {
      throw new TransactionAccountArchivedError();
    }
  }
}
