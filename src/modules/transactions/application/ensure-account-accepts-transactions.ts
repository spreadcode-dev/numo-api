import type { AccountLookup } from '../domain/account-lookup.js';
import {
  TransactionAccountArchivedError,
  TransactionAccountNotFoundError,
} from '../domain/transactions.errors.js';

export type AccountReference = {
  userId: string;
  accountId: string;
};

// Another user's account and an unknown id fail the same way, so a 404 never
// confirms that someone else's account exists.
export const ensureAccountAcceptsTransactions = async (
  accountLookup: AccountLookup,
  reference: AccountReference,
): Promise<void> => {
  const account = await accountLookup.findOwnedAccount(
    reference.userId,
    reference.accountId,
  );
  if (!account) {
    throw new TransactionAccountNotFoundError();
  }
  if (account.isArchived) {
    throw new TransactionAccountArchivedError();
  }
};
