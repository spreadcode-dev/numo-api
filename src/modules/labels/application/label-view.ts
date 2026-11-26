import type { Label } from '../domain/label.js';

export type LabelView = {
  id: string;
  name: string;
  color: string;
};

export const toLabelView = (label: Label): LabelView => ({
  id: label.id,
  name: label.name.value,
  color: label.color.value,
});
