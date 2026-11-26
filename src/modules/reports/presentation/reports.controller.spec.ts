import { BadRequestException } from '@nestjs/common';
import type { GetCashFlowUseCase } from '../application/get-cash-flow.use-case.js';
import type { GetNetWorthUseCase } from '../application/get-net-worth.use-case.js';
import { InvalidMonthCountError } from '../domain/reports.errors.js';
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

type UseCaseFakes = {
  getNetWorth?: GetNetWorthUseCase['execute'];
  getCashFlow?: GetCashFlowUseCase['execute'];
};

const controllerWith = (fakes: UseCaseFakes) =>
  new ReportsController(
    { execute: fakes.getNetWorth ?? vi.fn() } as unknown as GetNetWorthUseCase,
    { execute: fakes.getCashFlow ?? vi.fn() } as unknown as GetCashFlowUseCase,
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
});
