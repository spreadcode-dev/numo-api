import { LabelNotFoundError } from '../domain/labels.errors.js';
import { CreateLabelUseCase } from './create-label.use-case.js';
import { findOwnedLabel } from './find-owned-label.js';
import { InMemoryLabelRepository } from './testing/label-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const setUp = async () => {
  const labelRepository = new InMemoryLabelRepository();
  const label = await new CreateLabelUseCase(labelRepository).execute({
    userId: ANA,
    name: 'Groceries',
    color: '#15803d',
  });
  return { labelRepository, label };
};

describe('findOwnedLabel', () => {
  it("should return the user's own label", async () => {
    // Arrange
    const { labelRepository, label } = await setUp();

    // Act
    const found = await findOwnedLabel(labelRepository, {
      userId: ANA,
      labelId: label.id,
    });

    // Assert
    expect(found.id).toBe(label.id);
  });

  it("should not find another user's label", async () => {
    // Arrange
    const { labelRepository, label } = await setUp();

    // Act
    const find = findOwnedLabel(labelRepository, {
      userId: BRUNO,
      labelId: label.id,
    });

    // Assert
    await expect(find).rejects.toThrow(LabelNotFoundError);
  });

  it('should not find an unknown label', async () => {
    // Arrange
    const { labelRepository } = await setUp();

    // Act
    const find = findOwnedLabel(labelRepository, {
      userId: ANA,
      labelId: 'label-unknown',
    });

    // Assert
    await expect(find).rejects.toThrow(LabelNotFoundError);
  });
});
