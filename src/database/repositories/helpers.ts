import type { Db, SQLParam } from '../database';
import type { TableName } from '../schema';

type Row = { [column: string]: SQLParam };

/**
 * Inserts a row or updates it in place when the primary key exists.
 * Uses `ON CONFLICT ... DO UPDATE` (not `INSERT OR REPLACE`) so that child rows with
 * `ON DELETE CASCADE` are never wiped by an update.
 * Table and column names always come from code, never from user input.
 */
export async function upsertRow(db: Db, table: TableName, row: Row, conflictKey = 'id'): Promise<void> {
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter((c) => c !== conflictKey)
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');
  const sql = updates
    ? `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${conflictKey}) DO UPDATE SET ${updates}`
    : `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  await db.runAsync(sql, columns.map((c) => row[c]));
}

export async function insertRow(db: Db, table: TableName, row: Row): Promise<void> {
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  await db.runAsync(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    columns.map((c) => row[c]),
  );
}

export const bool = (value: number | null | undefined): boolean => value === 1;
export const int = (value: boolean): number => (value ? 1 : 0);

export function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
