import { BadRequestException } from '@nestjs/common';
import type { GetCashFlowUseCase } from '../application/get-cash-flow.use-case.js';
import type { GetNetWorthUseCase } from '../application/get-net-worth.use-case.js';
import type { GetSpendingByLabelUseCase } from '../application/get-spending-by-label.use-case.js';
import {
  InvalidMonthCountError,
  InvalidYearMonthError,
} from '../domain/reports.errors.js';
import { ReportsController } from './reports.controller.js';

const USER = { id: '6f1c1a9e-0000-4000-8000-000000000001' };

const NET_WORTH = {
  currency: 'BRL' as const,
  total: 100000,
  accounts: [
    { id: 'a', name: 'Checking', type: 'checking' as const, balance: 100000 },
  ],
};

const CASH_FLOW = [{ month: '2026-11', income: 500000, expense: 150000 }];

const SPENDING = {
  month: '2026-11',
  total: 5000,
  labels: [{ name: 'Unlabeled', amount: 5000 }],
};

type UseCaseFakes = {
  getNetWorth?: GetNetWorthUseCase['execute'];
  getCashFlow?: GetCashFlowUseCase['execute'];
  getSpendingByLabel?: GetSpendingByLabelUseCase['execute'];
};

const controllerWith = (fakes: UseCaseFakes) =>
  new ReportsController(
    { execute: fakes.getNetWorth ?? vi.fn() } as unknown as GetNetWorthUseCase,
    { execute: fakes.getCashFlow ?? vi.fn() } as unknown as GetCashFlowUseCase,
    {
      execute: fakes.getSpendingByLabel ?? vi.fn(),
    } as unknown as GetSpendingByLabelUseCase,
  );

describe('ReportsController', () => {
  it("should answer the net worth of the token's user", async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(NET_WORTH);
    const controller = controllerWith({ getNetWorth: execute });

    // Act
    const response = await controller.netWorth(USER);

    // Assert
    expect(response).toEqual(NET_WORTH);
    expect(execute).toHaveBeenCalledWith(USER.id);
  });

  it("should answer the token user's cash flow, with months as a number", async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(CASH_FLOW);
    const controller = controllerWith({ getCashFlow: execute });

    // Act
    const response = await controller.cashFlow(USER, {
      months: '1',
      to: '2026-11',
    });

    // Assert
    expect(response).toEqual(CASH_FLOW);
    expect(execute).toHaveBeenCalledWith({
      userId: USER.id,
      months: 1,
      to: '2026-11',
    });
  });

  it('should leave months and to out when they are not sent', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(CASH_FLOW);
    const controller = controllerWith({ getCashFlow: execute });

    // Act
    await controller.cashFlow(USER, {});

    // Assert
    expect(execute).toHaveBeenCalledWith({
      userId: USER.id,
      months: undefined,
      to: undefined,
    });
  });

  it('should answer 400 when months is out of range', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new InvalidMonthCountError());
    const controller = controllerWith({ getCashFlow: execute });

    // Act
    const cashFlow = controller.cashFlow(USER, { months: '25' });

    // Assert
    await expect(cashFlow).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should answer the token user's spending by label for the month", async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(SPENDING);
    const controller = controllerWith({ getSpendingByLabel: execute });

    // Act
    const response = await controller.spendingByLabel(USER, {
      month: '2026-11',
    });

    // Assert
    expect(response).toEqual(SPENDING);
    expect(execute).toHaveBeenCalledWith({ userId: USER.id, month: '2026-11' });
  });

  it('should answer 400 when the month does not exist', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new InvalidYearMonthError());
    const controller = controllerWith({ getSpendingByLabel: execute });

    // Act
    const spendingByLabel = controller.spendingByLabel(USER, {
      month: '2026-13',
    });

    // Assert
    await expect(spendingByLabel).rejects.toBeInstanceOf(BadRequestException);
  });
});
