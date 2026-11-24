import { AccountName } from './account-name.js';
import { InvalidAccountNameError } from './accounts.errors.js';

describe('AccountName', () => {
  it('should trim surrounding spaces', () => {
    // Act
    const name = AccountName.create('  Nubank card  ');

    // Assert
    expect(name.value).toBe('Nubank card');
  });

  it('should accept a name of exactly 60 characters', () => {
    // Act
    const name = AccountName.create('a'.repeat(60));

    // Assert
    expect(name.value).toHaveLength(60);
  });

  it('should count an emoji as one character', () => {
    // Act
    const name = AccountName.create('💰'.repeat(60));

    // Assert
    expect(name.value).toBe('💰'.repeat(60));
  });

  it.each(['', '   ', 'a'.repeat(61)])('should reject %j', (raw) => {
    // Act
    const create = () => AccountName.create(raw);

    // Assert
    expect(create).toThrow(InvalidAccountNameError);
  });
});
