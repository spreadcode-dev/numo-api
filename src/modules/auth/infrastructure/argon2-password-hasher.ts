import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import type { PasswordHasher } from '../domain/password-hasher.js';
import type { Password } from '../domain/password.js';

// OWASP minimums for argon2id (the library's default algorithm):
// 19 MiB of memory, 2 iterations, 1 degree of parallelism.
export const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

// Hash of a random, discarded password, made with ARGON2_OPTIONS so that
// verifying against it costs as much as checking a real user's password.
// Regenerate it whenever ARGON2_OPTIONS change (a test guards this).
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$vhoUTxHTRWSaV+QnxvZSxg$2ADUNGGCML6ANs5Ve5T4WzhCMgyD2iDjfFB+kqd/akk';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(password: Password): Promise<string> {
    return hash(password.value, ARGON2_OPTIONS);
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return verify(passwordHash, plainPassword);
  }

  async verifyWithoutUser(plainPassword: string): Promise<void> {
    await verify(DUMMY_PASSWORD_HASH, plainPassword);
  }
}
