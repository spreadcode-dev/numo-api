import type { Password } from './password.js';

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(password: Password): Promise<string>;
}
