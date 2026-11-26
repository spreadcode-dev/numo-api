import type { LabelRepository } from '../domain/label-repository.js';
import { findOwnedLabel, type LabelReference } from './find-owned-label.js';

export class DeleteLabelUseCase {
  constructor(private readonly labelRepository: LabelRepository) {}

  async execute(reference: LabelReference): Promise<void> {
    await findOwnedLabel(this.labelRepository, reference);
    await this.labelRepository.delete(reference.userId, reference.labelId);
  }
}
