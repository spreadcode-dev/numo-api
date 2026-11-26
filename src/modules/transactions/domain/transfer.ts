import type { Cents } from '@modules/accounts/domain/money.js';
import type { TransactionDate } from './transaction-date.js';
import type { TransactionDescription } from './transaction-description.js';
import type { NewTransaction } from './transaction-repository.js';
import type { Transaction } from './transaction.js';
import { SameTransferAccountError } from './transactions.errors.js';

export type NewTransfer = {
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  date: TransactionDate;
  amount: Cents;
  description: TransactionDescription;
};

export type TransferLegs = {
  outgoing: NewTransaction;
  incoming: NewTransaction;
};

export type Transfer = {
  transferId: string;
  outgoing: Transaction;
  incoming: Transaction;
};

// Money leaves one account and arrives in the other: the same amount, with
// opposite signs, so the user's total stays the same.
export const toTransferLegs = (transfer: NewTransfer): TransferLegs => {
  if (transfer.fromAccountId === transfer.toAccountId) {
    throw new SameTransferAccountError();
  }
  const leg = {
    userId: transfer.userId,
    date: transfer.date,
    description: transfer.description,
  };
  return {
    outgoing: {
      ...leg,
      accountId: transfer.fromAccountId,
      amount: -transfer.amount,
    },
    incoming: {
      ...leg,
      accountId: transfer.toAccountId,
      amount: transfer.amount,
    },
  };
};
