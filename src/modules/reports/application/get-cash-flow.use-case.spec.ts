import { FakeClock } from '@modules/auth/application/testing/clock.fake.js';
import {
  InvalidMonthCountError,
  InvalidYearMonthError,
} from '../domain/reports.errors.js';
import { GetCashFlowUseCase } from './get-cash-flow.use-case.js';
import { InMemoryCashFlowReport } from './testing/cash-flow-report.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const NOVEMBER_SALARY = { userId: ANA, date: '2026-11-05', amount: 500000 };
const NOVEMBER_MARKET = { userId: ANA, date: '2026-11-10', amount: -120000 };
const NOVEMBER_FUEL = { userId: ANA, date: '2026-11-30', amount: -30000 };

const setUp = (now = new Date('2026-11-26T12:00:00Z')) => {
  const cashFlowReport = new InMemoryCashFlowReport();
  return {
    cashFlowReport,
    getCashFlow: new GetCashFlowUseCase(cashFlowReport, new FakeClock(now)),
  };
};

describe('GetCashFlowUseCase', () => {
  it("should total the month's income and expenses, expenses as a positive number", async () => {
    // Arrange
    const { cashFlowReport, getCashFlow } = setUp();
    cashFlowReport.givenTransactions(
      NOVEMBER_SALARY,
      NOVEMBER_MARKET,
      NOVEMBER_FUEL,
    );

    // Act
    const months = await getCashFlow.execute({
      userId: ANA,
      months: 1,
      to: '2026-11',
    });

    // Assert
    expect(months).toEqual([
      { month: '2026-11', income: 500000, expense: 150000 },
    ]);
  });

  it('should list exactly the requested months, oldest first, with 0/0 for empty ones', async () => {
    // Arrange
    const { cashFlowReport, getCashFlow } = setUp();
    cashFlowReport.givenTransactions(NOVEMBER_SALARY);

    // Act
    const months = await getCashFlow.execute({
      userId: ANA,
      months: 3,
      to: '2026-11',
    });

    // Assert
    expect(months).toEqual([
      { month: '2026-09', income: 0, expense: 0 },
      { month: '2026-10', income: 0, expense: 0 },
      { month: '2026-11', income: 500000, expense: 0 },
    ]);
  });

  it('should leave transfers out', async () => {
    // Arrange
    const { cashFlowReport, getCashFlow } = setUp();
    cashFlowReport.givenTransactions(
      { ...NOVEMBER_MARKET, transferId: 'card-bill' },
      { ...NOVEMBER_SALARY, transferId: 'card-bill' },
    );

    // Act
    const months = await getCashFlow.execute({
      userId: ANA,
      months: 1,
      to: '2026-11',
    });

    // Assert
    expect(months).toEqual([{ month: '2026-11', income: 0, expense: 0 }]);
  });

  it("should only count the caller's transactions", async () => {
    // Arrange
    const { cashFlowReport, getCashFlow } = setUp();
    cashFlowReport.givenTransactions({ ...NOVEMBER_SALARY, userId: BRUNO });

    // Act
    const months = await getCashFlow.execute({
      userId: ANA,
      months: 1,
      to: '2026-11',
    });

    // Assert
    expect(months).toEqual([{ month: '2026-11', income: 0, expense: 0 }]);
  });

  it('should default to the last 12 months up to the current UTC month', async () => {
    // Arrange
    const { getCashFlow } = setUp(new Date('2026-12-31T23:30:00Z'));

    // Act
    const months = await getCashFlow.execute({ userId: ANA });

    // Assert
    expect(months).toHaveLength(12);
    expect(months.at(0)?.month).toBe('2026-01');
    expect(months.at(-1)?.month).toBe('2026-12');
  });

  it.each([0, 25, 1.5])('should reject months=%s', async (count) => {
    // Arrange
    const { getCashFlow } = setUp();

    // Act
    const execute = getCashFlow.execute({ userId: ANA, months: count });

    // Assert
    await expect(execute).rejects.toBeInstanceOf(InvalidMonthCountError);
  });

  it('should reject a month that does not exist', async () => {
    // Arrange
    const { getCashFlow } = setUp();

    // Act
    const execute = getCashFlow.execute({ userId: ANA, to: '2026-13' });

    // Assert
    await expect(execute).rejects.toBeInstanceOf(InvalidYearMonthError);
  });
});
