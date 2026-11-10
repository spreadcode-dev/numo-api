import { InvalidPasswordError } from './auth.errors.js';
import {
  Password,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './password.js';

describe('Password', () => {
  it('should accept the minimum length', () => {
    // Act
    const password = Password.create('a'.repeat(PASSWORD_MIN_LENGTH));

    // Assert
    expect(password.value).toHaveLength(PASSWORD_MIN_LENGTH);
  });

  it('should accept the maximum length', () => {
    // Act
    const password = Password.create('a'.repeat(PASSWORD_MAX_LENGTH));

    // Assert
    expect(password.value).toHaveLength(PASSWORD_MAX_LENGTH);
  });

  it('should reject a password shorter than the minimum', () => {
    // Act
    const create = () => Password.create('a'.repeat(PASSWORD_MIN_LENGTH - 1));

    // Assert
    expect(create).toThrow(InvalidPasswordError);
  });

  it('should reject a password longer than the maximum', () => {
    // Act
    const create = () => Password.create('a'.repeat(PASSWORD_MAX_LENGTH + 1));

    // Assert
    expect(create).toThrow(InvalidPasswordError);
  });

  it('should count an emoji as a single character', () => {
    // Arrange
    const elevenLettersAndOneEmoji = `${'a'.repeat(PASSWORD_MIN_LENGTH - 1)}🔒`;

    // Act
    const password = Password.create(elevenLettersAndOneEmoji);

    // Assert
    expect(password.value).toBe(elevenLettersAndOneEmoji);
  });
});
