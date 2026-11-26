import { InvalidLabelColorError } from './labels.errors.js';

// Same 8 values as numo-web's palette, chosen to read well in light and dark themes.
export const LABEL_COLORS = [
  '#2563eb', // blue
  '#15803d', // green
  '#0f766e', // teal
  '#7c3aed', // purple
  '#be185d', // pink
  '#b91c1c', // red
  '#f97316', // orange
  '#facc15', // yellow
] as const;

type PaletteColor = (typeof LABEL_COLORS)[number];

const isPaletteColor = (hex: string): hex is PaletteColor =>
  (LABEL_COLORS as readonly string[]).includes(hex);

export class LabelColor {
  private constructor(readonly value: PaletteColor) {}

  // Any casing is accepted; the stored and returned value is always lowercase.
  static create(raw: string): LabelColor {
    const hex = raw.toLowerCase();
    if (!isPaletteColor(hex)) {
      throw new InvalidLabelColorError();
    }
    return new LabelColor(hex);
  }
}
