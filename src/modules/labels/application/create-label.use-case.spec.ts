import {
  InvalidLabelColorError,
  InvalidLabelNameError,
  LabelNameAlreadyUsedError,
} from '../domain/labels.errors.js';
import { CreateLabelUseCase } from './create-label.use-case.js';
import { InMemoryLabelRepository } from './testing/label-repository.fake.js';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';
const GROCERIES = { userId: ANA, name: 'Groceries', color: '#15803d' };

const setUp = () => {
  const labelRepository = new InMemoryLabelRepository();
  return {
    labelRepository,
    createLabel: new CreateLabelUseCase(labelRepository),
  };
};

describe('CreateLabelUseCase', () => {
  it('should create the label for the user', async () => {
    // Arrange
    const { labelRepository, createLabel } = setUp();

    // Act
    const label = await createLabel.execute(GROCERIES);

    // Assert
    expect(label).toEqual({
      id: expect.any(String),
      name: 'Groceries',
      color: '#15803d',
    });
    expect(labelRepository.labels[0].userId).toBe(ANA);
  });

  it('should store an uppercase color in lowercase', async () => {
    // Arrange
    const { createLabel } = setUp();

    // Act
    const label = await createLabel.execute({ ...GROCERIES, color: '#2563EB' });

    // Assert
    expect(label.color).toBe('#2563eb');
  });

  it('should reject a name the user already has in any casing', async () => {
    // Arrange
    const { createLabel } = setUp();
    await createLabel.execute(GROCERIES);

    // Act
    const create = createLabel.execute({ ...GROCERIES, name: 'GROCERIES' });

    // Assert
    await expect(create).rejects.toThrow(LabelNameAlreadyUsedError);
  });

  it('should allow a name another user already has', async () => {
    // Arrange
    const { createLabel } = setUp();
    await createLabel.execute(GROCERIES);

    // Act
    const label = await createLabel.execute({ ...GROCERIES, userId: BRUNO });

    // Assert
    expect(label.name).toBe('Groceries');
  });

  it('should reject a color outside the palette', async () => {
    // Arrange
    const { createLabel } = setUp();

    // Act
    const create = createLabel.execute({ ...GROCERIES, color: '#3b82f6' });

    // Assert
    await expect(create).rejects.toThrow(InvalidLabelColorError);
  });

  it('should reject an empty name', async () => {
    // Arrange
    const { createLabel } = setUp();

    // Act
    const create = createLabel.execute({ ...GROCERIES, name: '' });

    // Assert
    await expect(create).rejects.toThrow(InvalidLabelNameError);
  });
});
