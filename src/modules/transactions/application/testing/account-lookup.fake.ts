import type {
  AccountLookup,
  TransactionAccount,
} from '../../domain/account-lookup.js';

type OwnedAccount = TransactionAccount & { userId: string };

export class InMemoryAccountLookup implements AccountLookup {
  readonly accounts: OwnedAccount[] = [];

  findOwnedAccount(
    userId: string,
    accountId: string,
  ): Promise<TransactionAccount | undefined> {
    const found = this.accounts.find(
      (account) => account.userId === userId && account.id === accountId,
    );
    return Promise.resolve(
      found && { id: found.id, isArchived: found.isArchived },
    );
  }
}
