import type { GetNetWorthUseCase } from '../application/get-net-worth.use-case.js';
import { ReportsController } from './reports.controller.js';

const USER = { id: '6f1c1a9e-0000-4000-8000-000000000001' };

const NET_WORTH = {
  currency: 'BRL' as const,
  total: 100000,
  accounts: [
    { id: 'a', name: 'Checking', type: 'checking' as const, balance: 100000 },
  ],
};

describe('ReportsController', () => {
  it("should answer the net worth of the token's user", async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(NET_WORTH);
    const controller = new ReportsController({
      execute,
    } as unknown as GetNetWorthUseCase);

    // Act
    const response = await controller.netWorth(USER);

    // Assert
    expect(response).toEqual(NET_WORTH);
    expect(execute).toHaveBeenCalledWith(USER.id);
  });
});
