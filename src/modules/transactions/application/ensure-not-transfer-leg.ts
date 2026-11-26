import type { Transaction } from '../domain/transaction.js';
import { TransactionIsTransferLegError } from '../domain/transactions.errors.js';

// Changing one leg on its own would leave the pair out of balance, so a leg
// only changes through /transfers.
export const ensureNotTransferLeg = (transaction: Transaction): void => {
  if (transaction.transferId !== undefined) {
    throw new TransactionIsTransferLegError();
  }
};
