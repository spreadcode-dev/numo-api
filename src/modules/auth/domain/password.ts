import { InvalidPasswordError } from './auth.errors.js';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export class Password {
  private constructor(readonly value: string) {}

  static create(raw: string): Password {
    const characters = new Intl.Segmenter();
    // Counts characters, not UTF-16 units, so an emoji counts as one (NIST).
    const length = [...characters.segment(raw)].length;
    if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
      throw new InvalidPasswordError();
    }
    return new Password(raw);
  }
}
