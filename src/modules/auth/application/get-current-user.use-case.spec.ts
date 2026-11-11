import { UserNotFoundError } from '../domain/auth.errors.js';
import { Email } from '../domain/email.js';
import { GetCurrentUserUseCase } from './get-current-user.use-case.js';
import { InMemoryUserRepository } from './testing/user-repository.fake.js';

describe('GetCurrentUserUseCase', () => {
  it('should return the id and email of the user', async () => {
    // Arrange
    const userRepository = new InMemoryUserRepository();
    const user = await userRepository.create({
      email: Email.create('ana@example.com'),
      passwordHash: 'hashed:correct-horse-battery',
    });
    const useCase = new GetCurrentUserUseCase(userRepository);

    // Act
    const currentUser = await useCase.execute(user.id);

    // Assert
    expect(currentUser).toEqual({ id: user.id, email: 'ana@example.com' });
  });

  it('should reject a user id that no longer exists', async () => {
    // Arrange
    const useCase = new GetCurrentUserUseCase(new InMemoryUserRepository());

    // Act
    const getCurrentUser = useCase.execute('user-404');

    // Assert
    await expect(getCurrentUser).rejects.toThrow(UserNotFoundError);
  });
});
