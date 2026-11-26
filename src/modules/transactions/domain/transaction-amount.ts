import type { Cents } from '@modules/accounts/domain/money.js';
import { InvalidTransactionAmountError } from './transactions.errors.js';

// Signed cents: negative is an expense, positive an income. Zero moves no money.
export const toTransactionAmount = (amount: number): Cents => {
  if (!Number.isSafeInteger(amount) || amount === 0) {
    throw new InvalidTransactionAmountError();
  }
  return amount;
};
