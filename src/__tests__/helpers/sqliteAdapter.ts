/// <reference types="node" />
/**
 * Minimal expo-sqlite stand-in backed by Node's built-in `node:sqlite`, so repository and store
 * code runs against a real SQLite engine in Jest (same SQL, migrations, constraints and cascades).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');

type Param = string | number | null;

function normalize(params: unknown[]): Param[] {
  const flat = params.length === 1 && Array.isArray(params[0]) ? (params[0] as unknown[]) : params;
  return flat.map((p) => (p === undefined ? null : (p as Param)));
}

export class FakeSQLiteDatabase {
  private db = new DatabaseSync(':memory:');

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const result = this.db.prepare(sql).run(...normalize(params));
    return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(sql).all(...normalize(params)) as T[];
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    return (this.db.prepare(sql).get(...normalize(params)) as T | undefined) ?? null;
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await task();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

let current: FakeSQLiteDatabase | null = null;

export const sqliteMock = {
  openDatabaseAsync: async () => {
    current = new FakeSQLiteDatabase();
    return current;
  },
};

export function currentDb(): FakeSQLiteDatabase {
  if (!current) throw new Error('database not opened');
  return current;
}
