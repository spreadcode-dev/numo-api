import type { TransactionLabel } from './transaction-label.js';

export const LABEL_LOOKUP = Symbol('LABEL_LOOKUP');

export interface LabelLookup {
  // Scoped to the user: another user's labels are never found, so the result
  // can be shorter than the ids asked for.
  findOwnedLabels(
    userId: string,
    labelIds: string[],
  ): Promise<TransactionLabel[]>;
}
