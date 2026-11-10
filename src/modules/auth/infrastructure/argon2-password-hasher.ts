import { Injectable } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import type { PasswordHasher } from '../domain/password-hasher.js';
import type { Password } from '../domain/password.js';

// OWASP minimums for argon2id (the library's default algorithm):
// 19 MiB of memory, 2 iterations, 1 degree of parallelism.
const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(password: Password): Promise<string> {
    return hash(password.value, ARGON2_OPTIONS);
  }
}
