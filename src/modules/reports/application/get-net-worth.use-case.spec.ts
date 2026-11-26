import type { AccountBalance } from './balances-report.js';
import { GetNetWorthUseCase } from './get-net-worth.use-case.js';
import { InMemoryBalancesReport } from './testing/balances-report.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const CHECKING: AccountBalance = {
  id: 'checking',
  name: 'Itaú checking',
  type: 'checking',
  balance: 100000,
};
const SAVINGS: AccountBalance = {
  id: 'savings',
  name: 'Savings',
  type: 'savings',
  balance: 250000,
};
const CARD: AccountBalance = {
  id: 'card',
  name: 'Nubank card',
  type: 'credit_card',
  balance: -150000,
};

const setUp = () => {
  const balancesReport = new InMemoryBalancesReport();
  return {
    balancesReport,
    getNetWorth: new GetNetWorthUseCase(balancesReport),
  };
};

describe('GetNetWorthUseCase', () => {
  it('should add up the balances, with the credit card counting negatively', async () => {
    // Arrange
    const { balancesReport, getNetWorth } = setUp();
    balancesReport.givenActiveAccounts(ANA, [CHECKING, CARD, SAVINGS]);

    // Act
    const netWorth = await getNetWorth.execute(ANA);

    // Assert
    expect(netWorth.currency).toBe('BRL');
    expect(netWorth.total).toBe(200000);
  });

  it('should sort the accounts by balance, highest first', async () => {
    // Arrange
    const { balancesReport, getNetWorth } = setUp();
    balancesReport.givenActiveAccounts(ANA, [CHECKING, CARD, SAVINGS]);

    // Act
    const netWorth = await getNetWorth.execute(ANA);

    // Assert
    expect(netWorth.accounts).toEqual([SAVINGS, CHECKING, CARD]);
  });

  it('should order accounts with the same balance by name, ignoring case', async () => {
    // Arrange
    const { balancesReport, getNetWorth } = setUp();
    const wallet = {
      id: 'w',
      name: 'wallet',
      type: 'cash',
      balance: 0,
    } as const;
    const inter = {
      id: 'i',
      name: 'Inter',
      type: 'checking',
      balance: 0,
    } as const;
    balancesReport.givenActiveAccounts(ANA, [wallet, inter]);

    // Act
    const netWorth = await getNetWorth.execute(ANA);

    // Assert
    expect(netWorth.accounts).toEqual([inter, wallet]);
  });

  it('should answer a zero total and no accounts for a user without accounts', async () => {
    // Arrange
    const { balancesReport, getNetWorth } = setUp();
    balancesReport.givenActiveAccounts(BRUNO, [CHECKING]);

    // Act
    const netWorth = await getNetWorth.execute(ANA);

    // Assert
    expect(netWorth).toEqual({ currency: 'BRL', total: 0, accounts: [] });
  });
});
