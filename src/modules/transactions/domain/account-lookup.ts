export const ACCOUNT_LOOKUP = Symbol('ACCOUNT_LOOKUP');

// What recording a transaction needs to know about an account, and nothing more.
export type TransactionAccount = {
  id: string;
  isArchived: boolean;
};

export interface AccountLookup {
  // Scoped to the user: another user's account is never found.
  findOwnedAccount(
    userId: string,
    accountId: string,
  ): Promise<TransactionAccount | undefined>;
}
