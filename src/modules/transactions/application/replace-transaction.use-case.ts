import type { AccountLookup } from '../domain/account-lookup.js';
import { toTransactionAmount } from '../domain/transaction-amount.js';
import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import type { TransactionLabelRepository } from '../domain/transaction-label-repository.js';
import type { TransactionRepository } from '../domain/transaction-repository.js';
import type { Transaction } from '../domain/transaction.js';
import { ensureAccountAcceptsTransactions } from './ensure-account-accepts-transactions.js';
import {
  findOwnedTransaction,
  type TransactionReference,
} from './find-owned-transaction.js';
import { type TransactionView, toTransactionView } from './transaction-view.js';

export type ReplaceTransactionCommand = TransactionReference & {
  accountId: string;
  date: string;
  amount: number;
  description: string;
};

type Replacement = Pick<
  Transaction,
  'accountId' | 'date' | 'amount' | 'description'
>;

// Every field is required and checked with the same rules as recording.
const toReplacement = (command: ReplaceTransactionCommand): Replacement => ({
  accountId: command.accountId,
  date: TransactionDate.create(command.date),
  amount: toTransactionAmount(command.amount),
  description: TransactionDescription.create(command.description),
});

export class ReplaceTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountLookup: AccountLookup,
    private readonly transactionLabelRepository: TransactionLabelRepository,
  ) {}

  async execute(command: ReplaceTransactionCommand): Promise<TransactionView> {
    const replacement = toReplacement(command);
    const transaction = await findOwnedTransaction(
      this.transactionRepository,
      command,
    );
    // Only the target account is checked, as when recording: a transaction
    // can be moved off an archived account, but not edited while on one.
    await ensureAccountAcceptsTransactions(this.accountLookup, command);

    const saved = await this.transactionRepository.update({
      ...transaction,
      ...replacement,
    });
    // Labels are set on their own route; a replace keeps them as they are.
    const labels = await this.transactionLabelRepository.labelsOf([saved.id]);
    return toTransactionView(saved, labels.get(saved.id) ?? []);
  }
}
