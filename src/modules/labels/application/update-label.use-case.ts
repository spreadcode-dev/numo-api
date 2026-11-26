import { LabelColor } from '../domain/label-color.js';
import { LabelName } from '../domain/label-name.js';
import type { LabelRepository } from '../domain/label-repository.js';
import type { Label } from '../domain/label.js';
import { LabelNameAlreadyUsedError } from '../domain/labels.errors.js';
import { findOwnedLabel, type LabelReference } from './find-owned-label.js';
import { type LabelView, toLabelView } from './label-view.js';

export type UpdateLabelCommand = LabelReference & {
  name?: string;
  color?: string;
};

// Only the fields sent are validated, with the same rules as create.
const applyChanges = (label: Label, command: UpdateLabelCommand): Label => ({
  ...label,
  name:
    command.name === undefined ? label.name : LabelName.create(command.name),
  color:
    command.color === undefined
      ? label.color
      : LabelColor.create(command.color),
});

export class UpdateLabelUseCase {
  constructor(private readonly labelRepository: LabelRepository) {}

  async execute(command: UpdateLabelCommand): Promise<LabelView> {
    const label = await findOwnedLabel(this.labelRepository, command);
    const edited = applyChanges(label, command);
    await this.ensureNameIsFree(label, edited.name);

    const saved = await this.labelRepository.update(edited);
    return toLabelView(saved);
  }

  private async ensureNameIsFree(
    label: Label,
    newName: LabelName,
  ): Promise<void> {
    if (label.name.matches(newName)) {
      return;
    }
    const exists = await this.labelRepository.existsByName(
      label.userId,
      newName,
    );
    if (exists) {
      throw new LabelNameAlreadyUsedError();
    }
  }
}
