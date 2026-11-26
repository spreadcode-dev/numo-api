import { LABEL_COLORS, LabelColor } from './label-color.js';
import { InvalidLabelColorError } from './labels.errors.js';

describe('LabelColor', () => {
  it.each(LABEL_COLORS)('should accept the palette color %s', (hex) => {
    // Act
    const color = LabelColor.create(hex);

    // Assert
    expect(color.value).toBe(hex);
  });

  it('should accept any casing and keep the color lowercase', () => {
    // Act
    const color = LabelColor.create('#2563EB');

    // Assert
    expect(color.value).toBe('#2563eb');
  });

  it.each(['#3b82f6', 'blue', '#2563e', '2563eb', '#2563ebff', ''])(
    'should reject %j',
    (raw) => {
      // Act
      const create = () => LabelColor.create(raw);

      // Assert
      expect(create).toThrow(InvalidLabelColorError);
    },
  );

  it('should list the whole palette in its error message', () => {
    // Act
    const message = new InvalidLabelColorError().message;

    // Assert
    expect(message).toBe(
      `Label color must be one of: ${LABEL_COLORS.join(', ')}`,
    );
  });
});
