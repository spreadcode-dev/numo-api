import type { ExecutionContext } from '@nestjs/common';
import { getCurrentUser } from './current-user.decorator.js';

describe('getCurrentUser', () => {
  it('should return the user the guard attached to the request', () => {
    // Arrange
    const user = { id: '6f1c1a9e-0000-4000-8000-000000000001' };
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;

    // Act
    const currentUser = getCurrentUser(undefined, context);

    // Assert
    expect(currentUser).toBe(user);
  });
});
