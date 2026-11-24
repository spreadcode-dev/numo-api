import type { AccountType } from '../domain/account-type.js';
import type { Account } from '../domain/account.js';
import type { Currency } from '../domain/currency.js';
import type { Cents } from '../domain/money.js';

export type AccountView = {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  openingBalance: Cents;
  balance: Cents;
  archivedAt?: Date;
};

// Balance is computed, never stored. Until transactions exist (#36) it is the opening balance.
export const toAccountView = (account: Account): AccountView => ({
  id: account.id,
  name: account.name.value,
  type: account.type,
  currency: account.currency,
  openingBalance: account.openingBalance,
  balance: account.openingBalance,
  archivedAt: account.archivedAt,
});
