import { ACCOUNT_TYPES, toAccountType } from './account-type.js';
import { InvalidAccountTypeError } from './accounts.errors.js';

describe('toAccountType', () => {
  it.each(ACCOUNT_TYPES)('should accept %s', (type) => {
    // Act
    const accountType = toAccountType(type);

    // Assert
    expect(accountType).toBe(type);
  });

  it.each(['loan', 'CHECKING', ''])('should reject %j', (raw) => {
    // Act
    const convert = () => toAccountType(raw);

    // Assert
    expect(convert).toThrow(InvalidAccountTypeError);
  });
});
