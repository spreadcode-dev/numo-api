import { InvalidTransactionDateError } from './transactions.errors.js';

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// A calendar day kept as text: converting it to a Date would attach a time
// zone and could shift it to the previous or next day.
export class TransactionDate {
  private constructor(readonly value: string) {}

  static create(raw: string): TransactionDate {
    if (!isCalendarDay(raw)) {
      throw new InvalidTransactionDateError();
    }
    return new TransactionDate(raw);
  }
}

// Date.UTC rolls 2026-02-30 over to March 2, so a day that doesn't exist fails the round trip.
const isCalendarDay = (raw: string): boolean => {
  const match = ISO_DAY.exec(raw);
  if (!match) {
    return false;
  }
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};
