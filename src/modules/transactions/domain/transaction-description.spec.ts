import { TransactionDescription } from './transaction-description.js';
import { InvalidTransactionDescriptionError } from './transactions.errors.js';

describe('TransactionDescription', () => {
  it('should trim surrounding spaces', () => {
    // Act
    const description = TransactionDescription.create('  Market  ');

    // Assert
    expect(description.value).toBe('Market');
  });

  it('should accept exactly 140 characters', () => {
    // Act
    const description = TransactionDescription.create('a'.repeat(140));

    // Assert
    expect(description.value).toHaveLength(140);
  });

  it('should count an emoji as one character', () => {
    // Act
    const description = TransactionDescription.create('🛒'.repeat(140));

    // Assert
    expect(description.value).toBe('🛒'.repeat(140));
  });

  it.each(['', '   ', 'a'.repeat(141)])('should reject %j', (raw) => {
    // Act
    const create = () => TransactionDescription.create(raw);

    // Assert
    expect(create).toThrow(InvalidTransactionDescriptionError);
  });
});
