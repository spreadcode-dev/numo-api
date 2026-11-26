import type { TransactionRepository } from '../domain/transaction-repository.js';
import type { Transaction } from '../domain/transaction.js';
import { TransactionNotFoundError } from '../domain/transactions.errors.js';

export type TransactionReference = {
  userId: string;
  transactionId: string;
};

// Another user's transaction and an unknown id fail the same way, so a 404
// never confirms that someone else's transaction exists.
export const findOwnedTransaction = async (
  transactionRepository: TransactionRepository,
  reference: TransactionReference,
): Promise<Transaction> => {
  const transaction = await transactionRepository.findById(
    reference.userId,
    reference.transactionId,
  );
  if (!transaction) {
    throw new TransactionNotFoundError();
  }
  return transaction;
};
