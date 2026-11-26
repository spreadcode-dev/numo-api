import { toTransaction } from './transaction-row.js';

const CREATED_AT = new Date('2026-11-26T12:00:00Z');

const ROW = {
  id: '1d2e3f4a-0000-4000-8000-000000000001',
  user_id: '6f1c1a9e-0000-4000-8000-000000000001',
  account_id: '9a2b3c4d-0000-4000-8000-000000000001',
  date: '2026-11-20',
  amount: '-4590',
  description: 'Market',
  transfer_id: null,
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
};

describe('toTransaction', () => {
  it('should leave the transfer id out of a transaction outside any transfer', () => {
    // Act
    const transaction = toTransaction(ROW);

    // Assert
    expect(transaction.transferId).toBeUndefined();
  });

  it('should keep the transfer id of a transfer leg', () => {
    // Arrange
    const transferId = '7e8f9a0b-0000-4000-8000-000000000001';

    // Act
    const transaction = toTransaction({ ...ROW, transfer_id: transferId });

    // Assert
    expect(transaction.transferId).toBe(transferId);
  });
});
