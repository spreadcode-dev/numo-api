import type { Password } from './password.js';

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(password: Password): Promise<string>;
  verify(plainPassword: string, passwordHash: string): Promise<boolean>;
  // Takes as long as verify() when no user matched the email, so login
  // response times don't reveal whether an email is registered.
  verifyWithoutUser(plainPassword: string): Promise<void>;
}
