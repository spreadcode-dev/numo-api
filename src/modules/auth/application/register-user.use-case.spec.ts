import {
  EmailAlreadyRegisteredError,
  InvalidPasswordError,
} from '../domain/auth.errors.js';
import type { Email } from '../domain/email.js';
import type { PasswordHasher } from '../domain/password-hasher.js';
import type { Password } from '../domain/password.js';
import type { NewUser, UserRepository } from '../domain/user-repository.js';
import type { User } from '../domain/user.js';
import { RegisterUserUseCase } from './register-user.use-case.js';

class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = [];

  existsByEmail(email: Email): Promise<boolean> {
    return Promise.resolve(
      this.users.some((user) => user.email.value === email.value),
    );
  }

  create(newUser: NewUser): Promise<User> {
    const now = new Date();
    const user: User = {
      id: `user-${this.users.length + 1}`,
      ...newUser,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(user);
    return Promise.resolve(user);
  }
}

class FakePasswordHasher implements PasswordHasher {
  hash(password: Password): Promise<string> {
    return Promise.resolve(`hashed:${password.value}`);
  }
}

const VALID_PASSWORD = 'correct-horse-battery';

const createUseCase = () => {
  const userRepository = new InMemoryUserRepository();
  const useCase = new RegisterUserUseCase(
    userRepository,
    new FakePasswordHasher(),
  );
  return { useCase, userRepository };
};

describe('RegisterUserUseCase', () => {
  it('should return the new user with a normalized email and no password', async () => {
    // Arrange
    const { useCase } = createUseCase();

    // Act
    const registered = await useCase.execute({
      email: ' Ana@Example.com ',
      password: VALID_PASSWORD,
    });

    // Assert
    expect(registered).toEqual({
      id: 'user-1',
      email: 'ana@example.com',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  it('should store the password hash, never the plain password', async () => {
    // Arrange
    const { useCase, userRepository } = createUseCase();

    // Act
    await useCase.execute({
      email: 'ana@example.com',
      password: VALID_PASSWORD,
    });

    // Assert
    expect(userRepository.users[0].passwordHash).toBe(
      `hashed:${VALID_PASSWORD}`,
    );
  });

  it('should reject an email that is already registered, whatever its casing', async () => {
    // Arrange
    const { useCase } = createUseCase();
    await useCase.execute({
      email: 'ana@example.com',
      password: VALID_PASSWORD,
    });

    // Act
    const register = useCase.execute({
      email: 'ANA@example.com',
      password: VALID_PASSWORD,
    });

    // Assert
    await expect(register).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('should not store anything when the password is invalid', async () => {
    // Arrange
    const { useCase, userRepository } = createUseCase();

    // Act
    const register = useCase.execute({
      email: 'ana@example.com',
      password: 'too-short',
    });

    // Assert
    await expect(register).rejects.toThrow(InvalidPasswordError);
    expect(userRepository.users).toHaveLength(0);
  });
});
