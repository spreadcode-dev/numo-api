import type { AccountName } from '../../domain/account-name.js';
import type {
  AccountRepository,
  NewAccount,
} from '../../domain/account-repository.js';
import type { Account } from '../../domain/account.js';

const sameName = (left: AccountName, right: AccountName): boolean =>
  left.value.toLowerCase() === right.value.toLowerCase();

export class InMemoryAccountRepository implements AccountRepository {
  readonly accounts: Account[] = [];

  existsByName(userId: string, name: AccountName): Promise<boolean> {
    const exists = this.accounts.some(
      (account) => account.userId === userId && sameName(account.name, name),
    );
    return Promise.resolve(exists);
  }

  create(newAccount: NewAccount): Promise<Account> {
    const now = new Date();
    const account: Account = {
      id: `account-${this.accounts.length + 1}`,
      ...newAccount,
      createdAt: now,
      updatedAt: now,
    };
    this.accounts.push(account);
    return Promise.resolve(account);
  }

  listByUser(userId: string): Promise<Account[]> {
    const owned = this.accounts.filter((account) => account.userId === userId);
    return Promise.resolve(owned);
  }
}
