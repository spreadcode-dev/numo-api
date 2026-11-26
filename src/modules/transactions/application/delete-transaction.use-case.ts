import type { TransactionRepository } from '../domain/transaction-repository.js';
import { ensureNotTransferLeg } from './ensure-not-transfer-leg.js';
import {
  findOwnedTransaction,
  type TransactionReference,
} from './find-owned-transaction.js';

export class DeleteTransactionUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(reference: TransactionReference): Promise<void> {
    const transaction = await findOwnedTransaction(
      this.transactionRepository,
      reference,
    );
    ensureNotTransferLeg(transaction);
    await this.transactionRepository.delete(
      reference.userId,
      reference.transactionId,
    );
  }
}
