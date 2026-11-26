import {
  InvalidLabelColorError,
  LabelNameAlreadyUsedError,
  LabelNotFoundError,
} from '../domain/labels.errors.js';
import { CreateLabelUseCase } from './create-label.use-case.js';
import { InMemoryLabelRepository } from './testing/label-repository.fake.js';
import { UpdateLabelUseCase } from './update-label.use-case.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const setUp = async () => {
  const labelRepository = new InMemoryLabelRepository();
  const createLabel = new CreateLabelUseCase(labelRepository);
  const label = await createLabel.execute({
    userId: ANA,
    name: 'Groceries',
    color: '#15803d',
  });
  return {
    createLabel,
    label,
    updateLabel: new UpdateLabelUseCase(labelRepository),
  };
};

describe('UpdateLabelUseCase', () => {
  it('should rename the label and keep its color', async () => {
    // Arrange
    const { label, updateLabel } = await setUp();

    // Act
    const updated = await updateLabel.execute({
      userId: ANA,
      labelId: label.id,
      name: 'Supermarket',
    });

    // Assert
    expect(updated).toEqual({ ...label, name: 'Supermarket' });
  });

  it('should recolor the label in lowercase and keep its name', async () => {
    // Arrange
    const { label, updateLabel } = await setUp();

    // Act
    const updated = await updateLabel.execute({
      userId: ANA,
      labelId: label.id,
      color: '#F97316',
    });

    // Assert
    expect(updated).toEqual({ ...label, color: '#f97316' });
  });

  it('should allow changing only the casing of its own name', async () => {
    // Arrange
    const { label, updateLabel } = await setUp();

    // Act
    const updated = await updateLabel.execute({
      userId: ANA,
      labelId: label.id,
      name: 'GROCERIES',
    });

    // Assert
    expect(updated.name).toBe('GROCERIES');
  });

  it("should reject a name used by another of the user's labels", async () => {
    // Arrange
    const { createLabel, label, updateLabel } = await setUp();
    await createLabel.execute({
      userId: ANA,
      name: 'Travel',
      color: '#2563eb',
    });

    // Act
    const update = updateLabel.execute({
      userId: ANA,
      labelId: label.id,
      name: 'travel',
    });

    // Assert
    await expect(update).rejects.toThrow(LabelNameAlreadyUsedError);
  });

  it('should reject a color outside the palette', async () => {
    // Arrange
    const { label, updateLabel } = await setUp();

    // Act
    const update = updateLabel.execute({
      userId: ANA,
      labelId: label.id,
      color: '#3b82f6',
    });

    // Assert
    await expect(update).rejects.toThrow(InvalidLabelColorError);
  });

  it("should not edit another user's label", async () => {
    // Arrange
    const { label, updateLabel } = await setUp();

    // Act
    const update = updateLabel.execute({
      userId: BRUNO,
      labelId: label.id,
      name: 'Mine now',
    });

    // Assert
    await expect(update).rejects.toThrow(LabelNotFoundError);
  });
});
