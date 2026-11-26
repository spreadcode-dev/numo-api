import { toTransactionLabelIds } from './transaction-label-ids.js';
import { InvalidTransactionLabelsError } from './transactions.errors.js';

const ids = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `label-${index}`);

describe('toTransactionLabelIds', () => {
  it('should accept up to 10 different labels', () => {
    // Act
    const labelIds = toTransactionLabelIds(ids(10));

    // Assert
    expect(labelIds).toEqual(ids(10));
  });

  it('should accept no labels at all', () => {
    // Act
    const labelIds = toTransactionLabelIds([]);

    // Assert
    expect(labelIds).toEqual([]);
  });

  it('should reject more than 10 labels', () => {
    // Act
    const create = () => toTransactionLabelIds(ids(11));

    // Assert
    expect(create).toThrow(InvalidTransactionLabelsError);
  });

  it('should reject the same label twice', () => {
    // Act
    const create = () => toTransactionLabelIds(['label-1', 'label-1']);

    // Assert
    expect(create).toThrow(InvalidTransactionLabelsError);
  });
});
