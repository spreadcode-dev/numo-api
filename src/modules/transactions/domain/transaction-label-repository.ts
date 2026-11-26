import type { TransactionLabel } from './transaction-label.js';

export const TRANSACTION_LABEL_REPOSITORY = Symbol(
  'TRANSACTION_LABEL_REPOSITORY',
);

// Links between transactions and labels. Callers check ownership first: the
// links themselves carry no user.
export interface TransactionLabelRepository {
  replaceLabels(transactionId: string, labelIds: string[]): Promise<void>;
  // One call for a whole page; a transaction without labels is absent from the map.
  labelsOf(transactionIds: string[]): Promise<Map<string, TransactionLabel[]>>;
}
