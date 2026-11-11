import type { Pool } from 'pg';
import { EmailAlreadyRegisteredError } from '../domain/auth.errors.js';
import { Email } from '../domain/email.js';
import { PgUserRepository } from './pg-user-repository.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const CREATED_AT = new Date('2026-11-10T12:00:00Z');

const USER_ROW = {
  id: '6f1c1a9e-0000-4000-8000-000000000001',
  email: 'ana@example.com',
  password_hash: '$argon2id$hash',
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
};

const NEW_USER = {
  email: Email.create('ana@example.com'),
  passwordHash: '$argon2id$hash',
};

const USER = {
  id: USER_ROW.id,
  email: Email.create('ana@example.com'),
  passwordHash: '$argon2id$hash',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

describe('PgUserRepository', () => {
  it('should report that an email exists when a row is found', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const repository = new PgUserRepository(poolWithQuery(query));

    // Act
    const exists = await repository.existsByEmail(NEW_USER.email);

    // Assert
    expect(exists).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.any(String), ['ana@example.com']);
  });

  it('should report that an email does not exist when no row is found', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgUserRepository(poolWithQuery(query));

    // Act
    const exists = await repository.existsByEmail(NEW_USER.email);

    // Assert
    expect(exists).toBe(false);
  });

  it('should return the inserted row as a user', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [USER_ROW] });
    const repository = new PgUserRepository(poolWithQuery(query));

    // Act
    const user = await repository.create(NEW_USER);

    // Assert
    expect(user).toEqual(USER);
  });

  it('should report a duplicate email when the unique index rejects the insert', async () => {
    // Arrange
    const query = vi.fn().mockRejectedValue({ code: '23505' });
    const repository = new PgUserRepository(poolWithQuery(query));

    // Act
    const create = repository.create(NEW_USER);

    // Assert
    await expect(create).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('should pass any other database error through unchanged', async () => {
    // Arrange
    const connectionError = new Error('connect ECONNREFUSED');
    const query = vi.fn().mockRejectedValue(connectionError);
    const repository = new PgUserRepository(poolWithQuery(query));

    // Act
    const create = repository.create(NEW_USER);

    // Assert
    await expect(create).rejects.toBe(connectionError);
  });

  it('should find a user by email, ignoring case', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [USER_ROW] });
    const repository = new PgUserRepository(poolWithQuery(query));

    // Act
    const user = await repository.findByEmail(NEW_USER.email);

    // Assert
    expect(user).toEqual(USER);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('lower(email) = lower($1)'),
      ['ana@example.com'],
    );
  });

  it('should return undefined when no user has that email', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgUserRepository(poolWithQuery(query));

    // Act
    const user = await repository.findByEmail(NEW_USER.email);

    // Assert
    expect(user).toBeUndefined();
  });

  it('should find a user by id', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [USER_ROW] });
    const repository = new PgUserRepository(poolWithQuery(query));

    // Act
    const user = await repository.findById(USER_ROW.id);

    // Assert
    expect(user).toEqual(USER);
    expect(query).toHaveBeenCalledWith(expect.any(String), [USER_ROW.id]);
  });

  it('should return undefined when no user has that id', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgUserRepository(poolWithQuery(query));

    // Act
    const user = await repository.findById(USER_ROW.id);

    // Assert
    expect(user).toBeUndefined();
  });
});
