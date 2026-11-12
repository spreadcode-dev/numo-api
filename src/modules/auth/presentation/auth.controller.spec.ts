import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { GetCurrentUserUseCase } from '../application/get-current-user.use-case.js';
import type { RegisterUserUseCase } from '../application/register-user.use-case.js';
import {
  EmailAlreadyRegisteredError,
  UserNotFoundError,
} from '../domain/auth.errors.js';
import { AuthController } from './auth.controller.js';

const REQUEST = { email: 'ana@example.com', password: 'correct-horse-battery' };
const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';

const REGISTERED_USER = {
  id: USER_ID,
  email: 'ana@example.com',
  createdAt: new Date('2026-11-10T12:00:00Z'),
  updatedAt: new Date('2026-11-10T12:00:00Z'),
};

type UseCaseFakes = {
  registerUser?: RegisterUserUseCase['execute'];
  getCurrentUser?: GetCurrentUserUseCase['execute'];
};

const controllerWith = (fakes: UseCaseFakes) =>
  new AuthController(
    { execute: fakes.registerUser ?? vi.fn() } as RegisterUserUseCase,
    { execute: fakes.getCurrentUser ?? vi.fn() } as GetCurrentUserUseCase,
  );

describe('AuthController', () => {
  it('should return the registered user', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(REGISTERED_USER);
    const controller = controllerWith({ registerUser: execute });

    // Act
    const response = await controller.register(REQUEST);

    // Assert
    expect(response).toEqual(REGISTERED_USER);
    expect(execute).toHaveBeenCalledWith(REQUEST);
  });

  it('should translate a domain error into an HTTP error', async () => {
    // Arrange
    const execute = vi
      .fn()
      .mockRejectedValue(new EmailAlreadyRegisteredError());
    const controller = controllerWith({ registerUser: execute });

    // Act
    const register = controller.register(REQUEST);

    // Assert
    await expect(register).rejects.toBeInstanceOf(ConflictException);
  });

  it('should return the id and email of the current user', async () => {
    // Arrange
    const currentUser = { id: USER_ID, email: 'ana@example.com' };
    const execute = vi.fn().mockResolvedValue(currentUser);
    const controller = controllerWith({ getCurrentUser: execute });

    // Act
    const response = await controller.me({ id: USER_ID });

    // Assert
    expect(response).toEqual(currentUser);
    expect(execute).toHaveBeenCalledWith(USER_ID);
  });

  it('should answer 401 when the current user no longer exists', async () => {
    // Arrange
    const execute = vi.fn().mockRejectedValue(new UserNotFoundError());
    const controller = controllerWith({ getCurrentUser: execute });

    // Act
    const me = controller.me({ id: USER_ID });

    // Assert
    await expect(me).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
