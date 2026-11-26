import type {
  LabelRepository,
  NewLabel,
} from '../../domain/label-repository.js';
import type { LabelName } from '../../domain/label-name.js';
import type { Label } from '../../domain/label.js';

export class InMemoryLabelRepository implements LabelRepository {
  labels: Label[] = [];
  private nextId = 1;

  existsByName(userId: string, name: LabelName): Promise<boolean> {
    const exists = this.labels.some(
      (label) => label.userId === userId && label.name.matches(name),
    );
    return Promise.resolve(exists);
  }

  create(newLabel: NewLabel): Promise<Label> {
    const now = new Date();
    const label: Label = {
      id: `label-${this.nextId++}`,
      ...newLabel,
      createdAt: now,
      updatedAt: now,
    };
    this.labels.push(label);
    return Promise.resolve(label);
  }

  listByUser(userId: string): Promise<Label[]> {
    const owned = this.labels.filter((label) => label.userId === userId);
    return Promise.resolve(owned);
  }

  findById(userId: string, labelId: string): Promise<Label | undefined> {
    const found = this.labels.find(
      (label) => label.userId === userId && label.id === labelId,
    );
    return Promise.resolve(found);
  }

  update(label: Label): Promise<Label> {
    const updated: Label = { ...label, updatedAt: new Date() };
    const index = this.labels.findIndex((stored) => stored.id === label.id);
    this.labels[index] = updated;
    return Promise.resolve(updated);
  }

  delete(userId: string, labelId: string): Promise<void> {
    this.labels = this.labels.filter(
      (label) => !(label.userId === userId && label.id === labelId),
    );
    return Promise.resolve();
  }
}
