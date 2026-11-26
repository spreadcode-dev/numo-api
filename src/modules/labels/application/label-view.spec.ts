import { LabelColor } from '../domain/label-color.js';
import { LabelName } from '../domain/label-name.js';
import { toLabelView } from './label-view.js';

describe('toLabelView', () => {
  it('should expose only the id, name and color', () => {
    // Arrange
    const createdAt = new Date('2026-11-26T12:00:00Z');
    const label = {
      id: 'label-1',
      userId: 'user-ana',
      name: LabelName.create('Groceries'),
      color: LabelColor.create('#15803d'),
      createdAt,
      updatedAt: createdAt,
    };

    // Act
    const view = toLabelView(label);

    // Assert
    expect(view).toEqual({
      id: 'label-1',
      name: 'Groceries',
      color: '#15803d',
    });
  });
});
