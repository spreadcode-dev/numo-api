import type { Cents } from '@modules/accounts/domain/money.js';
import type { TransactionLabel } from '../domain/transaction-label.js';
import type { Transaction } from '../domain/transaction.js';

export type TransactionView = {
  id: string;
  accountId: string;
  date: string;
  amount: Cents;
  description: string;
  labels: TransactionLabel[];
  transferId?: string;
};

// Same order as GET /labels: Portuguese, ignoring case and accents.
const byName = new Intl.Collator('pt-BR', { sensitivity: 'base' });

export const sortLabelsByName = (
  labels: TransactionLabel[],
): TransactionLabel[] =>
  [...labels].sort((left, right) => byName.compare(left.name, right.name));

export const toTransactionView = (
  transaction: Transaction,
  labels: TransactionLabel[],
): TransactionView => ({
  id: transaction.id,
  accountId: transaction.accountId,
  date: transaction.date.value,
  amount: transaction.amount,
  description: transaction.description.value,
  labels: sortLabelsByName(labels),
  transferId: transaction.transferId,
});
