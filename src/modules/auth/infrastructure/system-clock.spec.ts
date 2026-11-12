import { SystemClock } from './system-clock.js';

const NOW = new Date('2026-11-10T12:00:00Z');

describe('SystemClock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the current system time', () => {
    // Arrange
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const clock = new SystemClock();

    // Act
    const now = clock.now();

    // Assert
    expect(now).toEqual(NOW);
  });
});
