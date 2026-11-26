import { TransactionDate } from '../domain/transaction-date.js';
import { InvalidPageCursorError } from '../domain/transactions.errors.js';
import type { PagePosition } from './transaction-reader.js';

// The version ties a cursor to today's sort order: if that ever changes, old
// cursors fail with a 400 instead of silently skipping or repeating rows.
const CURSOR_VERSION = 'v1';
const SEPARATOR = '|';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Opaque to clients: they only pass it back as ?cursor=.
export const encodePageCursor = (position: PagePosition): string =>
  Buffer.from(
    [CURSOR_VERSION, position.date.value, position.id].join(SEPARATOR),
  ).toString('base64url');

// Validates every part, so a tampered cursor never reaches the database.
export const decodePageCursor = (cursor: string): PagePosition => {
  const [version, date, id, ...rest] = Buffer.from(cursor, 'base64url')
    .toString('utf8')
    .split(SEPARATOR);
  if (version !== CURSOR_VERSION || !UUID.test(id ?? '') || rest.length > 0) {
    throw new InvalidPageCursorError();
  }
  return { date: toCursorDate(date), id };
};

const toCursorDate = (raw: string): TransactionDate => {
  try {
    return TransactionDate.create(raw);
  } catch {
    throw new InvalidPageCursorError();
  }
};
