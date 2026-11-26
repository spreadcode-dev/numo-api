import { InvalidYearMonthError } from './reports.errors.js';

// Year 0 doesn't exist in Postgres dates, so years start at 1000.
const ISO_MONTH = /^([1-9]\d{3})-(0[1-9]|1[0-2])$/;
const MONTHS_PER_YEAR = 12;

// A calendar month with no day and no time zone, e.g. "2026-11".
export class YearMonth {
  private constructor(
    private readonly year: number,
    private readonly month: number,
  ) {}

  static parse(raw: string): YearMonth {
    const match = ISO_MONTH.exec(raw);
    if (!match) {
      throw new InvalidYearMonthError();
    }
    return new YearMonth(Number(match[1]), Number(match[2]));
  }

  static of(date: Date): YearMonth {
    return new YearMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  }

  get value(): string {
    const year = String(this.year).padStart(4, '0');
    const month = String(this.month).padStart(2, '0');
    return `${year}-${month}`;
  }

  monthsBefore(count: number): YearMonth {
    const monthIndex = this.year * MONTHS_PER_YEAR + this.month - 1 - count;
    return new YearMonth(
      Math.floor(monthIndex / MONTHS_PER_YEAR),
      (monthIndex % MONTHS_PER_YEAR) + 1,
    );
  }

  firstDay(): string {
    return `${this.value}-01`;
  }
}
