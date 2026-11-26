import type { LabelLookup } from '../../domain/label-lookup.js';
import type { TransactionLabel } from '../../domain/transaction-label.js';

type OwnedLabel = TransactionLabel & { userId: string };

const toTransactionLabel = (label: OwnedLabel): TransactionLabel => ({
  id: label.id,
  name: label.name,
  color: label.color,
});

export class InMemoryLabelLookup implements LabelLookup {
  readonly labels: OwnedLabel[] = [];

  findOwnedLabels(
    userId: string,
    labelIds: string[],
  ): Promise<TransactionLabel[]> {
    const owned = this.labels.filter(
      (label) => label.userId === userId && labelIds.includes(label.id),
    );
    return Promise.resolve(owned.map(toTransactionLabel));
  }

  // Any user's label, as the join from transaction_labels to labels sees it.
  findById(labelId: string): TransactionLabel | undefined {
    const found = this.labels.find((label) => label.id === labelId);
    return found && toTransactionLabel(found);
  }
}
