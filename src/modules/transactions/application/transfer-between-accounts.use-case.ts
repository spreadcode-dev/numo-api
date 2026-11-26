import type { AccountLookup } from '../domain/account-lookup.js';
import { TransactionDate } from '../domain/transaction-date.js';
import { TransactionDescription } from '../domain/transaction-description.js';
import { toTransferAmount } from '../domain/transfer-amount.js';
import type { TransferRepository } from '../domain/transfer-repository.js';
import { type NewTransfer, toTransferLegs } from '../domain/transfer.js';
import { ensureAccountAcceptsTransactions } from './ensure-account-accepts-transactions.js';
import { type TransactionView, toTransactionView } from './transaction-view.js';

export type TransferBetweenAccountsCommand = {
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  date: string;
  amount: number;
  description: string;
};

export type TransferView = {
  transferId: string;
  outgoing: TransactionView;
  incoming: TransactionView;
};

const toNewTransfer = (
  command: TransferBetweenAccountsCommand,
): NewTransfer => ({
  userId: command.userId,
  fromAccountId: command.fromAccountId,
  toAccountId: command.toAccountId,
  date: TransactionDate.create(command.date),
  amount: toTransferAmount(command.amount),
  description: TransactionDescription.create(command.description),
});

export class TransferBetweenAccountsUseCase {
  constructor(
    private readonly transferRepository: TransferRepository,
    private readonly accountLookup: AccountLookup,
  ) {}

  async execute(
    command: TransferBetweenAccountsCommand,
  ): Promise<TransferView> {
    const legs = toTransferLegs(toNewTransfer(command));
    await ensureAccountAcceptsTransactions(this.accountLookup, {
      userId: command.userId,
      accountId: command.fromAccountId,
    });
    await ensureAccountAcceptsTransactions(this.accountLookup, {
      userId: command.userId,
      accountId: command.toAccountId,
    });

    const transfer = await this.transferRepository.createTransfer(legs);
    return {
      transferId: transfer.transferId,
      outgoing: toTransactionView(transfer.outgoing, []),
      incoming: toTransactionView(transfer.incoming, []),
    };
  }
}
