import type { AccountRepository } from '../domain/account-repository.js';
import type { Account } from '../domain/account.js';
import { AccountNotFoundError } from '../domain/accounts.errors.js';

export type AccountReference = {
  userId: string;
  accountId: string;
};

// Another user's account and an unknown id fail the same way, so a 404 never
// confirms that someone else's account exists.
export const findOwnedAccount = async (
  accountRepository: AccountRepository,
  reference: AccountReference,
): Promise<Account> => {
  const account = await accountRepository.findById(
    reference.userId,
    reference.accountId,
  );
  if (!account) {
    throw new AccountNotFoundError();
  }
  return account;
};
