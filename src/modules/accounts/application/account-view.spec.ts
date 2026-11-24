import { AccountName } from '../domain/account-name.js';
import type { Account } from '../domain/account.js';
import { toAccountView } from './account-view.js';

const ACCOUNT: Account = {
  id: 'account-1',
  userId: 'user-1',
  name: AccountName.create('Nubank card'),
  type: 'credit_card',
  currency: 'BRL',
  openingBalance: -150000,
  createdAt: new Date('2026-11-24T12:00:00Z'),
  updatedAt: new Date('2026-11-24T12:00:00Z'),
};

describe('toAccountView', () => {
  it('should expose the name as text and hide the owner and timestamps', () => {
    // Act
    const view = toAccountView(ACCOUNT);

    // Assert
    expect(view).toEqual({
      id: 'account-1',
      name: 'Nubank card',
      type: 'credit_card',
      currency: 'BRL',
      openingBalance: -150000,
      balance: -150000,
      archivedAt: undefined,
    });
  });

  it('should keep the archive date of an archived account', () => {
    // Arrange
    const archivedAt = new Date('2026-12-01T09:00:00Z');

    // Act
    const view = toAccountView({ ...ACCOUNT, archivedAt });

    // Assert
    expect(view.archivedAt).toBe(archivedAt);
  });
});
