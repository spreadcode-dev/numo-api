import type { Pool } from 'pg';
import { LabelColor } from '../domain/label-color.js';
import { LabelName } from '../domain/label-name.js';
import { LabelNameAlreadyUsedError } from '../domain/labels.errors.js';
import { PgLabelRepository } from './pg-label-repository.js';

const poolWithQuery = (query: Pool['query']): Pick<Pool, 'query'> => ({
  query,
});

const USER_ID = '6f1c1a9e-0000-4000-8000-000000000001';
const CREATED_AT = new Date('2026-11-26T12:00:00Z');

const LABEL_ROW = {
  id: '7b3c4d5e-0000-4000-8000-000000000001',
  user_id: USER_ID,
  name: 'Groceries',
  color: '#15803d',
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
};

const NEW_LABEL = {
  userId: USER_ID,
  name: LabelName.create('Groceries'),
  color: LabelColor.create('#15803d'),
};

const LABEL = {
  id: LABEL_ROW.id,
  ...NEW_LABEL,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

describe('PgLabelRepository', () => {
  it('should report a name as taken when the user has a row with it', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const repository = new PgLabelRepository(poolWithQuery(query));

    // Act
    const exists = await repository.existsByName(USER_ID, NEW_LABEL.name);

    // Assert
    expect(exists).toBe(true);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('user_id = $1 AND lower(name) = lower($2)'),
      [USER_ID, 'Groceries'],
    );
  });

  it('should report a name as free when no row is found', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgLabelRepository(poolWithQuery(query));

    // Act
    const exists = await repository.existsByName(USER_ID, NEW_LABEL.name);

    // Assert
    expect(exists).toBe(false);
  });

  it('should return the inserted row as a label', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [LABEL_ROW] });
    const repository = new PgLabelRepository(poolWithQuery(query));

    // Act
    const label = await repository.create(NEW_LABEL);

    // Assert
    expect(label).toEqual(LABEL);
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      USER_ID,
      'Groceries',
      '#15803d',
    ]);
  });

  it('should report a duplicate name when the unique index rejects the insert', async () => {
    // Arrange
    const query = vi.fn().mockRejectedValue({ code: '23505' });
    const repository = new PgLabelRepository(poolWithQuery(query));

    // Act
    const create = repository.create(NEW_LABEL);

    // Assert
    await expect(create).rejects.toThrow(LabelNameAlreadyUsedError);
  });

  it('should pass any other database error through unchanged', async () => {
    // Arrange
    const connectionError = new Error('connect ECONNREFUSED');
    const query = vi.fn().mockRejectedValue(connectionError);
    const repository = new PgLabelRepository(poolWithQuery(query));

    // Act
    const create = repository.create(NEW_LABEL);

    // Assert
    await expect(create).rejects.toBe(connectionError);
  });

  it("should list only the given user's labels", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [LABEL_ROW] });
    const repository = new PgLabelRepository(poolWithQuery(query));

    // Act
    const labels = await repository.listByUser(USER_ID);

    // Assert
    expect(labels).toEqual([LABEL]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      [USER_ID],
    );
  });

  it("should find one of the user's labels by id", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [LABEL_ROW] });
    const repository = new PgLabelRepository(poolWithQuery(query));

    // Act
    const label = await repository.findById(USER_ID, LABEL_ROW.id);

    // Assert
    expect(label).toEqual(LABEL);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND user_id = $2'),
      [LABEL_ROW.id, USER_ID],
    );
  });

  it('should find nothing when no row matches the id and user', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgLabelRepository(poolWithQuery(query));

    // Act
    const label = await repository.findById(USER_ID, LABEL_ROW.id);

    // Assert
    expect(label).toBeUndefined();
  });

  it("should save the name and color of the owner's label", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [LABEL_ROW] });
    const repository = new PgLabelRepository(poolWithQuery(query));

    // Act
    const label = await repository.update(LABEL);

    // Assert
    expect(label).toEqual(LABEL);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND user_id = $2'),
      [LABEL_ROW.id, USER_ID, 'Groceries', '#15803d'],
    );
  });

  it('should report a duplicate name when the unique index rejects the update', async () => {
    // Arrange
    const query = vi.fn().mockRejectedValue({ code: '23505' });
    const repository = new PgLabelRepository(poolWithQuery(query));

    // Act
    const update = repository.update(LABEL);

    // Assert
    await expect(update).rejects.toThrow(LabelNameAlreadyUsedError);
  });

  it("should delete only the owner's label", async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PgLabelRepository(poolWithQuery(query));

    // Act
    await repository.delete(USER_ID, LABEL_ROW.id);

    // Assert
    expect(query).toHaveBeenCalledWith(
      'DELETE FROM labels WHERE id = $1 AND user_id = $2',
      [LABEL_ROW.id, USER_ID],
    );
  });
});
