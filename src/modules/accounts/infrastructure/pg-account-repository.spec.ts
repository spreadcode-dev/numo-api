import type { Pool } from 'pg';
import { AccountName } from '../domain/account-name.js';
import {
  AccountNameAlreadyUsedError,
  InvalidAmountError,
} from '../domain/accounts.errors.js';
import { PgAccountRepository } from './pg-account-repository.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';
const CREATED_AT = new Date('2026-11-24T12:00:00Z');

const ACCOUNT_ROW = {
  id: '9a2b3c4d-0000-4000-8000-000000000001',
  user_id: USER_ID,
  name: 'Nubank card',
  type: 'credit_card',
  currency: 'BRL',
  opening_balance: '-150000',
  archived_at: null,
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
};

const NEW_ACCOUNT = {
  userId: USER_ID,
  name: AccountName.create('Nubank card'),
  type: 'credit_card' as const,
  currency: 'BRL' as const,
  openingBalance: -150000,
};

const ACCOUNT = {
  id: ACCOUNT_ROW.id,
  ...NEW_ACCOUNT,
  archivedAt: undefined,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

describe('PgAccountRepository', () => {
  it('should report a name as taken when the user has a row with it', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const exists = await repository.existsByName(USER_ID, NEW_ACCOUNT.name);

    // Assert
    expect(exists).toBe(true);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('user_id = $1 AND lower(name) = lower($2)'),
      [USER_ID, 'Nubank card'],
    );
  });

  it('should report a name as free when no row is found', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const exists = await repository.existsByName(USER_ID, NEW_ACCOUNT.name);

    // Assert
    expect(exists).toBe(false);
  });

  it('should return the inserted row as an account with cents as a number', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [ACCOUNT_ROW] });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const account = await repository.create(NEW_ACCOUNT);

    // Assert
    expect(account).toEqual(ACCOUNT);
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      USER_ID,
      'Nubank card',
      'credit_card',
      'BRL',
      -150000,
    ]);
  });

  it('should report a duplicate name when the unique index rejects the insert', async () => {
    // Arrange
    const query = vi.fn().mockRejectedValue({ code: '23505' });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const create = repository.create(NEW_ACCOUNT);

    // Assert
    await expect(create).rejects.toThrow(AccountNameAlreadyUsedError);
  });

  it('should pass any other database error through unchanged', async () => {
    // Arrange
    const connectionError = new Error('connect ECONNREFUSED');
    const query = vi.fn().mockRejectedValue(connectionError);
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const create = repository.create(NEW_ACCOUNT);

    // Assert
    await expect(create).rejects.toBe(connectionError);
  });

  it("should list only the given user's accounts", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [ACCOUNT_ROW] });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const accounts = await repository.listByUser(USER_ID);

    // Assert
    expect(accounts).toEqual([ACCOUNT]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      [USER_ID],
    );
  });

  it('should keep the archive date of an archived account', async () => {
    // Arrange
    const archivedAt = new Date('2026-12-01T09:00:00Z');
    const query = vi.fn().mockResolvedValue({
      rows: [{ ...ACCOUNT_ROW, archived_at: archivedAt }],
    });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const [account] = await repository.listByUser(USER_ID);

    // Assert
    expect(account.archivedAt).toBe(archivedAt);
  });

  it('should reject a stored balance too large for a JavaScript number', async () => {
    // Arrange
    const tooLarge = { ...ACCOUNT_ROW, opening_balance: '9007199254740993' };
    const query = vi.fn().mockResolvedValue({ rows: [tooLarge] });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const list = repository.listByUser(USER_ID);

    // Assert
    await expect(list).rejects.toThrow(InvalidAmountError);
  });

  it("should find one of the user's accounts by id", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [ACCOUNT_ROW] });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const account = await repository.findById(USER_ID, ACCOUNT_ROW.id);

    // Assert
    expect(account).toEqual(ACCOUNT);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND user_id = $2'),
      [ACCOUNT_ROW.id, USER_ID],
    );
  });

  it('should find nothing when no row matches the id and user', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const account = await repository.findById(USER_ID, ACCOUNT_ROW.id);

    // Assert
    expect(account).toBeUndefined();
  });

  it("should save the editable fields of the owner's account", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [ACCOUNT_ROW] });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const account = await repository.update(ACCOUNT);

    // Assert
    expect(account).toEqual(ACCOUNT);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND user_id = $2'),
      [ACCOUNT_ROW.id, USER_ID, 'Nubank card', 'credit_card', -150000],
    );
  });

  it('should report a duplicate name when the unique index rejects the update', async () => {
    // Arrange
    const query = vi.fn().mockRejectedValue({ code: '23505' });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const update = repository.update(ACCOUNT);

    // Assert
    await expect(update).rejects.toThrow(AccountNameAlreadyUsedError);
  });

  it('should stamp the archive date with the database clock', async () => {
    // Arrange
    const archivedAt = new Date('2026-12-01T09:00:00Z');
    const query = vi.fn().mockResolvedValue({
      rows: [{ ...ACCOUNT_ROW, archived_at: archivedAt }],
    });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const account = await repository.archive(USER_ID, ACCOUNT_ROW.id);

    // Assert
    expect(account.archivedAt).toBe(archivedAt);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('archived_at = now()'),
      [ACCOUNT_ROW.id, USER_ID],
    );
  });

  it('should clear the archive date when unarchiving', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [ACCOUNT_ROW] });
    const repository = new PgAccountRepository(poolWithQuery(query));

    // Act
    const account = await repository.unarchive(USER_ID, ACCOUNT_ROW.id);

    // Assert
    expect(account.archivedAt).toBeUndefined();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('archived_at = NULL'),
      [ACCOUNT_ROW.id, USER_ID],
    );
  });
});
