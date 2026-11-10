import { InvalidEmailError } from './auth.errors.js';

export const EMAIL_MAX_LENGTH = 254;

// Deliberately loose (one "@" with text on both sides): strict format checks
// happen at the HTTP boundary; this guards the invariant inside the domain.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+$/;

export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (
      normalized.length > EMAIL_MAX_LENGTH ||
      !EMAIL_FORMAT.test(normalized)
    ) {
      throw new InvalidEmailError();
    }
    return new Email(normalized);
  }
}
