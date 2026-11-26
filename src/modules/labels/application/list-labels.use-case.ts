import type { LabelRepository } from '../domain/label-repository.js';
import { type LabelView, toLabelView } from './label-view.js';

// Portuguese, ignoring case and accents: "Lazer" sorts next to "lazer", "Saúde" next to "saude".
const byName = new Intl.Collator('pt-BR', { sensitivity: 'base' });

export class ListLabelsUseCase {
  constructor(private readonly labelRepository: LabelRepository) {}

  async execute(userId: string): Promise<LabelView[]> {
    const labels = await this.labelRepository.listByUser(userId);
    return labels
      .map(toLabelView)
      .sort((left, right) => byName.compare(left.name, right.name));
  }
}
