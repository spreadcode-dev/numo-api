import { InvalidLabelNameError } from './labels.errors.js';

export const LABEL_NAME_MAX_LENGTH = 30;

export class LabelName {
  private constructor(readonly value: string) {}

  static create(raw: string): LabelName {
    const trimmed = raw.trim();
    // Counts characters the way Postgres VARCHAR(30) does: an emoji is one, not two.
    const length = Array.from(trimmed).length;
    if (length === 0 || length > LABEL_NAME_MAX_LENGTH) {
      throw new InvalidLabelNameError();
    }
    return new LabelName(trimmed);
  }

  // Mirrors the unique index on lower(name): names differing only in casing collide.
  matches(other: LabelName): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }
}
