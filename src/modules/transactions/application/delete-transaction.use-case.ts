import type { TransactionRepository } from '../domain/transaction-repository.js';
import {
  findOwnedTransaction,
  type TransactionReference,
} from './find-owned-transaction.js';

export class DeleteTransactionUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(reference: TransactionReference): Promise<void> {
    await findOwnedTransaction(this.transactionRepository, reference);
    await this.transactionRepository.delete(
      reference.userId,
      reference.transactionId,
    );
  }
}
