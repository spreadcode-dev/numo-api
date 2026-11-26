import { LabelColor } from '../domain/label-color.js';
import { LabelName } from '../domain/label-name.js';
import type { LabelRepository } from '../domain/label-repository.js';
import { LabelNameAlreadyUsedError } from '../domain/labels.errors.js';
import { type LabelView, toLabelView } from './label-view.js';

export type CreateLabelCommand = {
  userId: string;
  name: string;
  color: string;
};

export class CreateLabelUseCase {
  constructor(private readonly labelRepository: LabelRepository) {}

  async execute(command: CreateLabelCommand): Promise<LabelView> {
    const name = LabelName.create(command.name);
    const color = LabelColor.create(command.color);
    await this.ensureNameIsFree(command.userId, name);

    const label = await this.labelRepository.create({
      userId: command.userId,
      name,
      color,
    });
    return toLabelView(label);
  }

  private async ensureNameIsFree(
    userId: string,
    name: LabelName,
  ): Promise<void> {
    const exists = await this.labelRepository.existsByName(userId, name);
    if (exists) {
      throw new LabelNameAlreadyUsedError();
    }
  }
}
