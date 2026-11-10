import { verify } from '@node-rs/argon2';
import { Password } from '../domain/password.js';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';

const PLAIN_PASSWORD = 'correct-horse-battery';

describe('Argon2PasswordHasher', () => {
  it('should produce an argon2id hash', async () => {
    // Arrange
    const hasher = new Argon2PasswordHasher();

    // Act
    const passwordHash = await hasher.hash(Password.create(PLAIN_PASSWORD));

    // Assert
    expect(passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('should produce a hash that verifies against the original password', async () => {
    // Arrange
    const hasher = new Argon2PasswordHasher();

    // Act
    const passwordHash = await hasher.hash(Password.create(PLAIN_PASSWORD));

    // Assert
    await expect(verify(passwordHash, PLAIN_PASSWORD)).resolves.toBe(true);
  });
});
