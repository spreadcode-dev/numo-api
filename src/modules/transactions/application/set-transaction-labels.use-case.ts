import type { LabelLookup } from '../domain/label-lookup.js';
import { toTransactionLabelIds } from '../domain/transaction-label-ids.js';
import type { TransactionLabelRepository } from '../domain/transaction-label-repository.js';
import type { TransactionLabel } from '../domain/transaction-label.js';
import type { TransactionRepository } from '../domain/transaction-repository.js';
import { TransactionLabelNotFoundError } from '../domain/transactions.errors.js';
import {
  findOwnedTransaction,
  type TransactionReference,
} from './find-owned-transaction.js';
import { sortLabelsByName } from './transaction-view.js';

export type SetTransactionLabelsCommand = TransactionReference & {
  labelIds: string[];
};

// Replaces the whole set, so sending the same labels twice changes nothing.
export class SetTransactionLabelsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly labelLookup: LabelLookup,
    private readonly transactionLabelRepository: TransactionLabelRepository,
  ) {}

  async execute(
    command: SetTransactionLabelsCommand,
  ): Promise<TransactionLabel[]> {
    const labelIds = toTransactionLabelIds(command.labelIds);
    await findOwnedTransaction(this.transactionRepository, command);
    const labels = await this.findOwnedLabels(command.userId, labelIds);

    await this.transactionLabelRepository.replaceLabels(
      command.transactionId,
      labelIds,
    );
    return sortLabelsByName(labels);
  }

  // Another user's label and an unknown id fail the same way, so a 404 never
  // confirms that someone else's label exists.
  private async findOwnedLabels(
    userId: string,
    labelIds: string[],
  ): Promise<TransactionLabel[]> {
    const labels = await this.labelLookup.findOwnedLabels(userId, labelIds);
    if (labels.length !== labelIds.length) {
      throw new TransactionLabelNotFoundError();
    }
    return labels;
  }
}
