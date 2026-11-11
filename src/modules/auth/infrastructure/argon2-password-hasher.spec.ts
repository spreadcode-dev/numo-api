import { verify } from '@node-rs/argon2';
import { Password } from '../domain/password.js';
import {
  ARGON2_OPTIONS,
  Argon2PasswordHasher,
  DUMMY_PASSWORD_HASH,
} from './argon2-password-hasher.js';

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

  it('should verify the password the hash was made from', async () => {
    // Arrange
    const hasher = new Argon2PasswordHasher();
    const passwordHash = await hasher.hash(Password.create(PLAIN_PASSWORD));

    // Act
    const isCorrect = await hasher.verify(PLAIN_PASSWORD, passwordHash);

    // Assert
    expect(isCorrect).toBe(true);
  });

  it('should reject a different password', async () => {
    // Arrange
    const hasher = new Argon2PasswordHasher();
    const passwordHash = await hasher.hash(Password.create(PLAIN_PASSWORD));

    // Act
    const isCorrect = await hasher.verify('wrong-password', passwordHash);

    // Assert
    expect(isCorrect).toBe(false);
  });

  it('should complete a verification when there is no user', async () => {
    // Arrange
    const hasher = new Argon2PasswordHasher();

    // Act
    const verifyWithoutUser = hasher.verifyWithoutUser(PLAIN_PASSWORD);

    // Assert
    await expect(verifyWithoutUser).resolves.toBeUndefined();
  });

  it('should keep the dummy hash in sync with the hashing parameters', () => {
    // Arrange
    const { memoryCost, timeCost, parallelism } = ARGON2_OPTIONS;

    // Act
    const parameters = `$m=${memoryCost},t=${timeCost},p=${parallelism}$`;

    // Assert
    expect(DUMMY_PASSWORD_HASH).toContain(parameters);
  });
});
