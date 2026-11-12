import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type {
  GeneratedRefreshToken,
  RefreshTokenGenerator,
} from '../domain/refresh-token-generator.js';

// 256 bits of randomness: a fast hash is safe for lookups because nobody can guess the value.
const TOKEN_BYTES = 32;
const HASH_ALGORITHM = 'sha256';

@Injectable()
export class CryptoRefreshTokenGenerator implements RefreshTokenGenerator {
  generate(): GeneratedRefreshToken {
    const value = randomBytes(TOKEN_BYTES).toString('base64url');
    const hash = this.hash(value);
    return { value, hash };
  }

  hash(value: string): string {
    return createHash(HASH_ALGORITHM).update(value).digest('hex');
  }
}
