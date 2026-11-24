import { isUniqueViolation } from './postgres-errors.js';

describe('isUniqueViolation', () => {
  it('should recognise the Postgres unique violation code', () => {
    // Act
    const isViolation = isUniqueViolation({ code: '23505' });

    // Assert
    expect(isViolation).toBe(true);
  });

  it.each([
    { code: '23514' },
    new Error('connect ECONNREFUSED'),
    'not an object',
    undefined,
  ])('should not treat %j as a unique violation', (error) => {
    // Act
    const isViolation = isUniqueViolation(error);

    // Assert
    expect(isViolation).toBe(false);
  });
});
