import type { AccountBalance, BalancesReport } from '../balances-report.js';

export class InMemoryBalancesReport implements BalancesReport {
  private readonly balancesByUser = new Map<string, AccountBalance[]>();

  givenActiveAccounts(userId: string, accounts: AccountBalance[]): void {
    this.balancesByUser.set(userId, accounts);
  }

  listActiveAccountBalances(userId: string): Promise<AccountBalance[]> {
    return Promise.resolve(this.balancesByUser.get(userId) ?? []);
  }
}
