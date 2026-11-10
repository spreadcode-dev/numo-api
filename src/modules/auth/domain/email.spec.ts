import { InvalidEmailError } from './auth.errors.js';
import { Email, EMAIL_MAX_LENGTH } from './email.js';

describe('Email', () => {
  it('should trim and lowercase the address', () => {
    // Act
    const email = Email.create('  Ana@Example.COM ');

    // Assert
    expect(email.value).toBe('ana@example.com');
  });

  it('should reject an address without "@"', () => {
    // Act
    const create = () => Email.create('ana.example.com');

    // Assert
    expect(create).toThrow(InvalidEmailError);
  });

  it('should reject an address longer than the maximum length', () => {
    // Arrange
    const tooLong = `${'a'.repeat(EMAIL_MAX_LENGTH)}@example.com`;

    // Act
    const create = () => Email.create(tooLong);

    // Assert
    expect(create).toThrow(InvalidEmailError);
  });
});
