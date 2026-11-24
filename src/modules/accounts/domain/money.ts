import { InvalidAmountError } from './accounts.errors.js';

// Signed integer cents: -150000 is -R$ 1,500.00. Floats can't hold 0.10 exactly.
export type Cents = number;

export const toCents = (amount: number): Cents => {
  if (!Number.isSafeInteger(amount)) {
    throw new InvalidAmountError();
  }
  return amount;
};
