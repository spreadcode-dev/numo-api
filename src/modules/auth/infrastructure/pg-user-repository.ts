import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../shared/database/database.tokens.js';
import { EmailAlreadyRegisteredError } from '../domain/auth.errors.js';
import { Email } from '../domain/email.js';
import type { NewUser, UserRepository } from '../domain/user-repository.js';
import type { User } from '../domain/user.js';

// Postgres error code for a unique constraint violation (e.g. duplicate email)
const UNIQUE_VIOLATION = '23505';

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
};

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: Email.create(row.email),
  passwordHash: row.password_hash,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === UNIQUE_VIOLATION;

@Injectable()
export class PgUserRepository implements UserRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  async existsByEmail(email: Email): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM users WHERE lower(email) = lower($1)',
      [email.value],
    );

    return result.rows.length > 0;
  }

  async create(newUser: NewUser): Promise<User> {
    try {
      const result = await this.pool.query<UserRow>(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2)
             RETURNING id, email, password_hash, created_at, updated_at`,
        [newUser.email.value, newUser.passwordHash],
      );
      return toUser(result.rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }
}
