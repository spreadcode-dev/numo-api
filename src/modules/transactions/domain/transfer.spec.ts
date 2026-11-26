import { TransactionDate } from './transaction-date.js';
import { TransactionDescription } from './transaction-description.js';
import { toTransferLegs } from './transfer.js';
import { SameTransferAccountError } from './transactions.errors.js';

const CARD_PAYMENT = {
  userId: 'user-ana',
  fromAccountId: 'account-checking',
  toAccountId: 'account-card',
  date: TransactionDate.create('2026-11-20'),
  amount: 50000,
  description: TransactionDescription.create('Card bill'),
};

describe('toTransferLegs', () => {
  it('should take the amount out of the source account', () => {
    // Act
    const { outgoing } = toTransferLegs(CARD_PAYMENT);

    // Assert
    expect(outgoing).toEqual({
      userId: 'user-ana',
      accountId: 'account-checking',
      date: CARD_PAYMENT.date,
      amount: -50000,
      description: CARD_PAYMENT.description,
    });
  });

  it('should put the amount into the destination account', () => {
    // Act
    const { incoming } = toTransferLegs(CARD_PAYMENT);

    // Assert
    expect(incoming).toMatchObject({
      accountId: 'account-card',
      amount: 50000,
    });
  });

  it('should reject the same account on both sides', () => {
    // Act
    const create = () =>
      toTransferLegs({ ...CARD_PAYMENT, toAccountId: 'account-checking' });

    // Assert
    expect(create).toThrow(SameTransferAccountError);
  });
});
