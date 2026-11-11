import type { PasswordHasher } from '../../domain/password-hasher.js';
import type { Password } from '../../domain/password.js';

export class FakePasswordHasher implements PasswordHasher {
  verificationsWithoutUser = 0;

  hash(password: Password): Promise<string> {
    return Promise.resolve(`hashed:${password.value}`);
  }

  verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return Promise.resolve(passwordHash === `hashed:${plainPassword}`);
  }

  verifyWithoutUser(): Promise<void> {
    this.verificationsWithoutUser++;
    return Promise.resolve();
  }
}
