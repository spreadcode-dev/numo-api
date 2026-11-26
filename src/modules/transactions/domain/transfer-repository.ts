import type { Transaction } from './transaction.js';
import type { Transfer, TransferLegs } from './transfer.js';

export const TRANSFER_REPOSITORY = Symbol('TRANSFER_REPOSITORY');

// Both legs are written and removed together, so a transfer never ends up
// with only one side. Every method is scoped to one user.
export interface TransferRepository {
  createTransfer(legs: TransferLegs): Promise<Transfer>;
  findTransferLegs(userId: string, transferId: string): Promise<Transaction[]>;
  deleteTransfer(userId: string, transferId: string): Promise<void>;
}
