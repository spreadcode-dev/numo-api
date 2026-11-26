import { CreateLabelUseCase } from './create-label.use-case.js';
import { ListLabelsUseCase } from './list-labels.use-case.js';
import { InMemoryLabelRepository } from './testing/label-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';

const setUp = () => {
  const labelRepository = new InMemoryLabelRepository();
  return {
    createLabel: new CreateLabelUseCase(labelRepository),
    listLabels: new ListLabelsUseCase(labelRepository),
  };
};

describe('ListLabelsUseCase', () => {
  it('should return an empty list for a new user', async () => {
    // Arrange
    const { listLabels } = setUp();

    // Act
    const labels = await listLabels.execute(ANA);

    // Assert
    expect(labels).toEqual([]);
  });

  it('should sort by name ignoring case and accents', async () => {
    // Arrange
    const { createLabel, listLabels } = setUp();
    for (const name of [
      'trip to Lisbon',
      'Saúde',
      'groceries',
      'Reimbursable',
    ]) {
      await createLabel.execute({ userId: ANA, name, color: '#2563eb' });
    }

    // Act
    const labels = await listLabels.execute(ANA);

    // Assert
    expect(labels.map((label) => label.name)).toEqual([
      'groceries',
      'Reimbursable',
      'Saúde',
      'trip to Lisbon',
    ]);
  });

  it("should not include another user's labels", async () => {
    // Arrange
    const { createLabel, listLabels } = setUp();
    await createLabel.execute({
      userId: BRUNO,
      name: 'Mine',
      color: '#2563eb',
    });

    // Act
    const labels = await listLabels.execute(ANA);

    // Assert
    expect(labels).toEqual([]);
  });
});
