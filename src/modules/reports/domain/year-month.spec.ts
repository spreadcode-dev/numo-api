import { InvalidYearMonthError } from './reports.errors.js';
import { YearMonth } from './year-month.js';

describe('YearMonth', () => {
  it('should parse a YYYY-MM month', () => {
    // Act
    const month = YearMonth.parse('2026-11');

    // Assert
    expect(month.value).toBe('2026-11');
  });

  it.each([
    '2026-13',
    '2026-00',
    '2026-1',
    '26-11',
    '2026-11-01',
    '0000-01',
    '',
  ])('should reject %j', (raw) => {
    // Act
    const parse = () => YearMonth.parse(raw);

    // Assert
    expect(parse).toThrow(InvalidYearMonthError);
  });

  it('should take the UTC month of a moment', () => {
    // Arrange
    const lastSecondOfNovemberUtc = new Date('2026-11-30T23:59:59Z');

    // Act
    const month = YearMonth.of(lastSecondOfNovemberUtc);

    // Assert
    expect(month.value).toBe('2026-11');
  });

  it('should go back across a year boundary', () => {
    // Arrange
    const november = YearMonth.parse('2026-11');

    // Act
    const earlier = november.monthsBefore(11);

    // Assert
    expect(earlier.value).toBe('2025-12');
  });

  it('should stay on the same month when going back zero months', () => {
    // Act
    const same = YearMonth.parse('2026-01').monthsBefore(0);

    // Assert
    expect(same.value).toBe('2026-01');
  });

  it('should give the first day as a calendar date', () => {
    // Act
    const firstDay = YearMonth.parse('2026-02').firstDay();

    // Assert
    expect(firstDay).toBe('2026-02-01');
  });
});
