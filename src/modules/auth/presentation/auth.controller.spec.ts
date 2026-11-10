import { ConflictException } from '@nestjs/common';
import type { RegisterUserUseCase } from '../application/register-user.use-case.js';
import { EmailAlreadyRegisteredError } from '../domain/auth.errors.js';
import { AuthController } from './auth.controller.js';

const REQUEST = { email: 'ana@example.com', password: 'correct-horse-battery' };

const REGISTERED_USER = {
  id: '6f1c1a9e-0000-4000-8000-000000000001',
  email: 'ana@example.com',
  createdAt: new Date('2026-11-10T12:00:00Z'),
  updatedAt: new Date('2026-11-10T12:00:00Z'),
};

const controllerWith = (execute: RegisterUserUseCase['execute']) =>
  new AuthController({ execute } as RegisterUserUseCase);

describe('AuthController', () => {
  it('should return the registered user', async () => {
    // Arrange
    const execute = vi.fn().mockResolvedValue(REGISTERED_USER);
    const controller = controllerWith(execute);

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
    const controller = controllerWith(execute);

    // Act
    const register = controller.register(REQUEST);

    // Assert
    await expect(register).rejects.toBeInstanceOf(ConflictException);
  });
});
