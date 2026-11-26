import type { Cents } from '@modules/accounts/domain/money.js';
import type { TransactionDate } from './transaction-date.js';
import type { TransactionDescription } from './transaction-description.js';

export type Transaction = {
  id: string;
  userId: string;
  accountId: string;
  date: TransactionDate;
  amount: Cents;
  description: TransactionDescription;
  // Set only on the two legs of a transfer.
  transferId?: string;
  createdAt: Date;
  updatedAt: Date;
};
