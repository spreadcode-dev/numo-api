import {
  EmailAlreadyRegisteredError,
  InvalidPasswordError,
} from '../domain/auth.errors.js';
import { RegisterUserUseCase } from './register-user.use-case.js';
import { FakePasswordHasher } from './testing/password-hasher.fake.js';
import { InMemoryUserRepository } from './testing/user-repository.fake.js';

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
