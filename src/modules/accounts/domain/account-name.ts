import { InvalidAccountNameError } from './accounts.errors.js';

export const ACCOUNT_NAME_MAX_LENGTH = 60;

export class AccountName {
  private constructor(readonly value: string) {}

  static create(raw: string): AccountName {
    const trimmed = raw.trim();
    // Counts characters the way Postgres VARCHAR(60) does: an emoji is one, not two.
    const length = Array.from(trimmed).length;
    if (length === 0 || length > ACCOUNT_NAME_MAX_LENGTH) {
      throw new InvalidAccountNameError();
    }
    return new AccountName(trimmed);
  }

  // Mirrors the unique index on lower(name): names differing only in casing collide.
  matches(other: AccountName): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }
}
