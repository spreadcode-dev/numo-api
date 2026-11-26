import type { AccountType } from '@modules/accounts/domain/account-type.js';
import type { Cents } from '@modules/accounts/domain/money.js';

export const BALANCES_REPORT = Symbol('BALANCES_REPORT');

export type AccountBalance = {
  id: string;
  name: string;
  type: AccountType;
  balance: Cents;
};

export interface BalancesReport {
  // The user's non-archived accounts, each with its opening balance plus all its transactions.
  listActiveAccountBalances(userId: string): Promise<AccountBalance[]>;
}
