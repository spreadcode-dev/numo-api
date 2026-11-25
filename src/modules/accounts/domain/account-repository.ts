import type { AccountName } from './account-name.js';
import type { AccountType } from './account-type.js';
import type { Account } from './account.js';
import type { Currency } from './currency.js';
import type { Cents } from './money.js';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export type NewAccount = {
  userId: string;
  name: AccountName;
  type: AccountType;
  currency: Currency;
  openingBalance: Cents;
};

// Every method is scoped to one user: another user's accounts don't exist here.
export interface AccountRepository {
  existsByName(userId: string, name: AccountName): Promise<boolean>;
  create(newAccount: NewAccount): Promise<Account>;
  listByUser(userId: string): Promise<Account[]>;
  findById(userId: string, accountId: string): Promise<Account | undefined>;
  update(account: Account): Promise<Account>;
  archive(userId: string, accountId: string): Promise<Account>;
  unarchive(userId: string, accountId: string): Promise<Account>;
}
