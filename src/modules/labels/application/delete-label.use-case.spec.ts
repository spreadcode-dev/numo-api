import { LabelNotFoundError } from '../domain/labels.errors.js';
import { CreateLabelUseCase } from './create-label.use-case.js';
import { DeleteLabelUseCase } from './delete-label.use-case.js';
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
  return {
    labelRepository,
    label,
    deleteLabel: new DeleteLabelUseCase(labelRepository),
  };
};

describe('DeleteLabelUseCase', () => {
  it("should remove the user's label", async () => {
    // Arrange
    const { labelRepository, label, deleteLabel } = await setUp();

    // Act
    await deleteLabel.execute({ userId: ANA, labelId: label.id });

    // Assert
    expect(labelRepository.labels).toEqual([]);
  });

  it("should not delete another user's label", async () => {
    // Arrange
    const { labelRepository, label, deleteLabel } = await setUp();

    // Act
    const remove = deleteLabel.execute({ userId: BRUNO, labelId: label.id });

    // Assert
    await expect(remove).rejects.toThrow(LabelNotFoundError);
    expect(labelRepository.labels).toHaveLength(1);
  });

  it('should reject an unknown label', async () => {
    // Arrange
    const { deleteLabel } = await setUp();

    // Act
    const remove = deleteLabel.execute({
      userId: ANA,
      labelId: 'label-unknown',
    });

    // Assert
    await expect(remove).rejects.toThrow(LabelNotFoundError);
  });
});
