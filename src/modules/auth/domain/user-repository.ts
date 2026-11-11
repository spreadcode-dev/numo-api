import type { Email } from './email.js';
import type { User } from './user.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export type NewUser = {
  email: Email;
  passwordHash: string;
};

export interface UserRepository {
  existsByEmail(email: Email): Promise<boolean>;
  findByEmail(email: Email): Promise<User | undefined>;
  findById(id: string): Promise<User | undefined>;
  create(newUser: NewUser): Promise<User>;
}
