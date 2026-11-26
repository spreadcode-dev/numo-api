import type { Cents } from '@modules/accounts/domain/money.js';
import type { Transaction } from '../domain/transaction.js';

export type TransactionView = {
  id: string;
  accountId: string;
  date: string;
  amount: Cents;
  description: string;
};

export const toTransactionView = (
  transaction: Transaction,
): TransactionView => ({
  id: transaction.id,
  accountId: transaction.accountId,
  date: transaction.date.value,
  amount: transaction.amount,
  description: transaction.description.value,
});
