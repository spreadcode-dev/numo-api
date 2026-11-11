import type { AccessToken, AccessTokenIssuer } from '../domain/access-token.js';
import { InvalidCredentialsError } from '../domain/auth.errors.js';
import { Email } from '../domain/email.js';
import { LoginUseCase } from './login.use-case.js';
import { FakePasswordHasher } from './testing/password-hasher.fake.js';
import { InMemoryUserRepository } from './testing/user-repository.fake.js';

const PASSWORD = 'correct-horse-battery';

class FakeAccessTokenIssuer implements AccessTokenIssuer {
  issue(userId: string): Promise<AccessToken> {
    return Promise.resolve({
      value: `token-for:${userId}`,
      expiresInSeconds: 900,
    });
  }
}

const createUseCase = async () => {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  await userRepository.create({
    email: Email.create('ana@example.com'),
    passwordHash: `hashed:${PASSWORD}`,
  });
  const useCase = new LoginUseCase(
    userRepository,
    passwordHasher,
    new FakeAccessTokenIssuer(),
  );
  return { useCase, passwordHasher };
};

describe('LoginUseCase', () => {
  it('should issue an access token for the user when the credentials are correct', async () => {
    // Arrange
    const { useCase } = await createUseCase();

    // Act
    const accessToken = await useCase.execute({
      email: 'Ana@Example.com',
      password: PASSWORD,
    });

    // Assert
    expect(accessToken).toEqual({
      value: 'token-for:user-1',
      expiresInSeconds: 900,
    });
  });

  it('should reject a wrong password', async () => {
    // Arrange
    const { useCase } = await createUseCase();

    // Act
    const login = useCase.execute({
      email: 'ana@example.com',
      password: 'wrong-password',
    });

    // Assert
    await expect(login).rejects.toThrow(InvalidCredentialsError);
  });

  it('should reject an unknown email with the same error as a wrong password', async () => {
    // Arrange
    const { useCase } = await createUseCase();

    // Act
    const login = useCase.execute({
      email: 'bob@example.com',
      password: PASSWORD,
    });

    // Assert
    await expect(login).rejects.toThrow(InvalidCredentialsError);
  });

  it('should still verify a password when the email is unknown, so timing reveals nothing', async () => {
    // Arrange
    const { useCase, passwordHasher } = await createUseCase();

    // Act
    await useCase
      .execute({ email: 'bob@example.com', password: PASSWORD })
      .catch(() => undefined);

    // Assert
    expect(passwordHasher.verificationsWithoutUser).toBe(1);
  });
});
