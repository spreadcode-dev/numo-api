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

// Balance is computed, never stored: correcting the opening balance moves it too.
export const toAccountView = (account: Account): AccountView => ({
  id: account.id,
  name: account.name.value,
  type: account.type,
  currency: account.currency,
  openingBalance: account.openingBalance,
  balance: account.openingBalance + account.transactionsTotal,
  archivedAt: account.archivedAt,
});
