import { LabelName } from './label-name.js';
import { InvalidLabelNameError } from './labels.errors.js';

describe('LabelName', () => {
  it('should trim surrounding spaces', () => {
    // Act
    const name = LabelName.create('  Groceries  ');

    // Assert
    expect(name.value).toBe('Groceries');
  });

  it('should accept a name of exactly 30 characters', () => {
    // Act
    const name = LabelName.create('a'.repeat(30));

    // Assert
    expect(name.value).toHaveLength(30);
  });

  it('should count an emoji as one character', () => {
    // Act
    const name = LabelName.create('🛒'.repeat(30));

    // Assert
    expect(name.value).toBe('🛒'.repeat(30));
  });

  it.each(['', '   ', 'a'.repeat(31)])('should reject %j', (raw) => {
    // Act
    const create = () => LabelName.create(raw);

    // Assert
    expect(create).toThrow(InvalidLabelNameError);
  });

  it('should match a name that differs only in casing', () => {
    // Arrange
    const name = LabelName.create('Groceries');

    // Act
    const matches = name.matches(LabelName.create('GROCERIES'));

    // Assert
    expect(matches).toBe(true);
  });

  it('should not match a different name', () => {
    // Arrange
    const name = LabelName.create('Groceries');

    // Act
    const matches = name.matches(LabelName.create('Trip to Lisbon'));

    // Assert
    expect(matches).toBe(false);
  });
});
