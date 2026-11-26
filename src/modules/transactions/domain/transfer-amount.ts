import type { Cents } from '@modules/accounts/domain/money.js';
import { InvalidTransferAmountError } from './transactions.errors.js';

// Always positive: the direction comes from the from/to accounts, not the sign.
export const toTransferAmount = (amount: number): Cents => {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new InvalidTransferAmountError();
  }
  return amount;
};
