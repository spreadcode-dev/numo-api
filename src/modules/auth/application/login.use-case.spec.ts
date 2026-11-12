import { InvalidCredentialsError } from '../domain/auth.errors.js';
import { Email } from '../domain/email.js';
import { LoginUseCase } from './login.use-case.js';
import { SessionIssuer } from './session-issuer.js';
import { FakeAccessTokenIssuer } from './testing/access-token-issuer.fake.js';
import { FakePasswordHasher } from './testing/password-hasher.fake.js';
import { createInMemoryRefreshTokens } from './testing/refresh-tokens.fake.js';
import { InMemoryUserRepository } from './testing/user-repository.fake.js';

const PASSWORD = 'correct-horse-battery';

const createUseCase = async () => {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const { refreshTokens, repository } = createInMemoryRefreshTokens();
  await userRepository.create({
    email: Email.create('ana@example.com'),
    passwordHash: `hashed:${PASSWORD}`,
  });
  const useCase = new LoginUseCase(
    userRepository,
    passwordHasher,
    new SessionIssuer(new FakeAccessTokenIssuer(), refreshTokens),
  );
  return { useCase, passwordHasher, refreshTokenRepository: repository };
};

describe('LoginUseCase', () => {
  it('should start a session for the user when the credentials are correct', async () => {
    // Arrange
    const { useCase } = await createUseCase();

    // Act
    const session = await useCase.execute({
      email: 'Ana@Example.com',
      password: PASSWORD,
    });

    // Assert
    expect(session).toEqual({
      accessToken: { value: 'token-for:user-1', expiresInSeconds: 900 },
      refreshToken: {
        value: 'refresh-1',
        expiresAt: new Date('2026-11-17T12:00:00Z'),
      },
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

  it('should not store a refresh token when the password is wrong', async () => {
    // Arrange
    const { useCase, refreshTokenRepository } = await createUseCase();

    // Act
    await useCase
      .execute({ email: 'ana@example.com', password: 'wrong-password' })
      .catch(() => undefined);

    // Assert
    expect(refreshTokenRepository.tokens).toHaveLength(0);
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
