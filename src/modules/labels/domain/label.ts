import type { LabelColor } from './label-color.js';
import type { LabelName } from './label-name.js';

export type Label = {
  id: string;
  userId: string;
  name: LabelName;
  color: LabelColor;
  createdAt: Date;
  updatedAt: Date;
};
