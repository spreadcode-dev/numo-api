import { parseDurationSeconds } from './duration.js';

describe('parseDurationSeconds', () => {
  it.each([
    ['30s', 30],
    ['15m', 900],
    ['1h', 3_600],
  ])('should convert %s to %i seconds', (value, seconds) => {
    // Arrange
    const variableName = 'SOME_TTL';

    // Act
    const parsed = parseDurationSeconds(variableName, value);

    // Assert
    expect(parsed).toBe(seconds);
  });

  it.each(['', '15', '15 minutes', '0m', '1d', '-5s'])(
    'should refuse a malformed duration of "%s" and name the variable',
    (value) => {
      // Arrange
      const variableName = 'SOME_TTL';

      // Act
      const parse = () => parseDurationSeconds(variableName, value);

      // Assert
      expect(parse).toThrow(
        /SOME_TTL must be a positive number followed by s, m or h/,
      );
    },
  );
});
