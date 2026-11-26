import type { AccountName } from './account-name.js';
import type { AccountType } from './account-type.js';
import type { Currency } from './currency.js';
import type { Cents } from './money.js';

export type Account = {
  id: string;
  userId: string;
  name: AccountName;
  type: AccountType;
  currency: Currency;
  openingBalance: Cents;
  // Sum of the account's transaction amounts; 0 when it has none.
  transactionsTotal: Cents;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
