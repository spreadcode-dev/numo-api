import { TransactionDate } from '../domain/transaction-date.js';
import { InvalidPageCursorError } from '../domain/transactions.errors.js';
import { decodePageCursor, encodePageCursor } from './page-cursor.js';

const ID = '1d2e3f4a-0000-4000-8000-000000000001';
const POSITION = { date: TransactionDate.create('2026-11-20'), id: ID };

const base64url = (text: string): string =>
  Buffer.from(text).toString('base64url');

describe('page cursor', () => {
  it('should decode back to the position it encodes', () => {
    // Act
    const decoded = decodePageCursor(encodePageCursor(POSITION));

    // Assert
    expect(decoded.date.value).toBe('2026-11-20');
    expect(decoded.id).toBe(ID);
  });

  it('should be safe to put in a URL without escaping', () => {
    // Act
    const cursor = encodePageCursor(POSITION);

    // Assert
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['not base64url at all', '%%%'],
    ['empty', ''],
    ['another version', base64url(`v2|2026-11-20|${ID}`)],
    ['an impossible date', base64url(`v1|2026-02-30|${ID}`)],
    ['an id that is not a UUID', base64url('v1|2026-11-20|1 OR 1=1')],
    ['a missing id', base64url('v1|2026-11-20')],
    ['extra parts', base64url(`v1|2026-11-20|${ID}|more`)],
  ])('should reject a cursor with %s', (_case, cursor) => {
    // Act
    const decode = () => decodePageCursor(cursor);

    // Assert
    expect(decode).toThrow(InvalidPageCursorError);
  });
});
