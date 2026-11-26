import { InvalidTransactionLabelsError } from './transactions.errors.js';

export const MAX_LABELS_PER_TRANSACTION = 10;

export const toTransactionLabelIds = (labelIds: string[]): string[] => {
  const hasDuplicates = new Set(labelIds).size !== labelIds.length;
  if (labelIds.length > MAX_LABELS_PER_TRANSACTION || hasDuplicates) {
    throw new InvalidTransactionLabelsError();
  }
  return labelIds;
};
