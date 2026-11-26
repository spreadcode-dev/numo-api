import {
  type Currency,
  DEFAULT_CURRENCY,
} from '@modules/accounts/domain/currency.js';
import type { Cents } from '@modules/accounts/domain/money.js';
import type { AccountBalance, BalancesReport } from './balances-report.js';

// Same collation as the accounts list, so ties read in a familiar order.
const byName = new Intl.Collator('pt-BR', { sensitivity: 'base' });

export type NetWorth = {
  currency: Currency;
  total: Cents;
  accounts: AccountBalance[];
};

const byBalanceDescending = (left: AccountBalance, right: AccountBalance) =>
  right.balance - left.balance || byName.compare(left.name, right.name);

// Credit cards need no special case: their balance is already negative.
// Transfers net to zero across the two legs, so they leave the total as is.
const sumBalances = (accounts: AccountBalance[]): Cents =>
  accounts.reduce((total, account) => total + account.balance, 0);

export class GetNetWorthUseCase {
  constructor(private readonly balancesReport: BalancesReport) {}

  async execute(userId: string): Promise<NetWorth> {
    const accounts =
      await this.balancesReport.listActiveAccountBalances(userId);
    return {
      currency: DEFAULT_CURRENCY,
      total: sumBalances(accounts),
      accounts: accounts.toSorted(byBalanceDescending),
    };
  }
}
