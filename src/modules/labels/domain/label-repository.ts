import type { LabelColor } from './label-color.js';
import type { LabelName } from './label-name.js';
import type { Label } from './label.js';

export const LABEL_REPOSITORY = Symbol('LABEL_REPOSITORY');

export type NewLabel = {
  userId: string;
  name: LabelName;
  color: LabelColor;
};

// Every method is scoped to one user: another user's labels don't exist here.
export interface LabelRepository {
  existsByName(userId: string, name: LabelName): Promise<boolean>;
  create(newLabel: NewLabel): Promise<Label>;
  listByUser(userId: string): Promise<Label[]>;
  findById(userId: string, labelId: string): Promise<Label | undefined>;
  update(label: Label): Promise<Label>;
  delete(userId: string, labelId: string): Promise<void>;
}
