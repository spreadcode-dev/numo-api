import { InvalidTransactionDescriptionError } from './transactions.errors.js';

export const TRANSACTION_DESCRIPTION_MAX_LENGTH = 140;

export class TransactionDescription {
  private constructor(readonly value: string) {}

  static create(raw: string): TransactionDescription {
    const trimmed = raw.trim();
    // Counts characters the way Postgres VARCHAR(140) does: an emoji is one, not two.
    const length = Array.from(trimmed).length;
    if (length === 0 || length > TRANSACTION_DESCRIPTION_MAX_LENGTH) {
      throw new InvalidTransactionDescriptionError();
    }
    return new TransactionDescription(trimmed);
  }
}
