import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL } from '@shared/database/database.tokens.js';
import { isUniqueViolation } from '@shared/database/postgres-errors.js';
import type { Pool } from 'pg';
import { LabelColor } from '../domain/label-color.js';
import { LabelName } from '../domain/label-name.js';
import type { LabelRepository, NewLabel } from '../domain/label-repository.js';
import type { Label } from '../domain/label.js';
import { LabelNameAlreadyUsedError } from '../domain/labels.errors.js';

type LabelRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: Date;
  updated_at: Date;
};

const LABEL_COLUMNS = 'id, user_id, name, color, created_at, updated_at';

const toLabel = (row: LabelRow): Label => ({
  id: row.id,
  userId: row.user_id,
  name: LabelName.create(row.name),
  color: LabelColor.create(row.color),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// The unique index on (user_id, lower(name)) is the last line of defence when
// two requests race past the existsByName check.
const toWriteError = (error: unknown): unknown =>
  isUniqueViolation(error) ? new LabelNameAlreadyUsedError() : error;

@Injectable()
export class PgLabelRepository implements LabelRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>) {}

  async existsByName(userId: string, name: LabelName): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM labels WHERE user_id = $1 AND lower(name) = lower($2)',
      [userId, name.value],
    );

    return result.rows.length > 0;
  }

  async create(newLabel: NewLabel): Promise<Label> {
    try {
      const result = await this.pool.query<LabelRow>(
        `INSERT INTO labels (user_id, name, color)
             VALUES ($1, $2, $3)
             RETURNING ${LABEL_COLUMNS}`,
        [newLabel.userId, newLabel.name.value, newLabel.color.value],
      );
      return toLabel(result.rows[0]);
    } catch (error) {
      throw toWriteError(error);
    }
  }

  async listByUser(userId: string): Promise<Label[]> {
    const result = await this.pool.query<LabelRow>(
      `SELECT ${LABEL_COLUMNS} FROM labels WHERE user_id = $1`,
      [userId],
    );

    return result.rows.map(toLabel);
  }

  async findById(userId: string, labelId: string): Promise<Label | undefined> {
    const result = await this.pool.query<LabelRow>(
      `SELECT ${LABEL_COLUMNS} FROM labels WHERE id = $1 AND user_id = $2`,
      [labelId, userId],
    );

    return result.rows.map(toLabel).at(0);
  }

  async update(label: Label): Promise<Label> {
    try {
      const result = await this.pool.query<LabelRow>(
        `UPDATE labels
            SET name = $3, color = $4, updated_at = now()
          WHERE id = $1 AND user_id = $2
          RETURNING ${LABEL_COLUMNS}`,
        [label.id, label.userId, label.name.value, label.color.value],
      );
      return toLabel(result.rows[0]);
    } catch (error) {
      throw toWriteError(error);
    }
  }

  async delete(userId: string, labelId: string): Promise<void> {
    await this.pool.query('DELETE FROM labels WHERE id = $1 AND user_id = $2', [
      labelId,
      userId,
    ]);
  }
}
