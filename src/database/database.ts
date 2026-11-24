import * as SQLite from 'expo-sqlite';

import { LATEST_SCHEMA_VERSION, migrations } from './migrations';

export const DATABASE_NAME = 'orbit.db';

export class DatabaseError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current > LATEST_SCHEMA_VERSION) {
    // A newer build wrote this database. Refuse to touch it rather than risk data loss.
    throw new DatabaseError(
      `Database schema v${current} is newer than this app supports (v${LATEST_SCHEMA_VERSION}). Please update the app.`,
    );
  }

  for (const migration of migrations) {
    if (migration.version <= current) continue;
    // Each migration runs atomically: either the whole step applies, or nothing changes.
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);
  await migrate(db);
  return db;
}

/** Returns the shared database connection, opening and migrating it on first use. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open().catch((error: unknown) => {
      dbPromise = null; // allow a retry on the next call
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Could not open the local database.', error);
    });
  }
  return dbPromise;
}

/** Runs `work` inside a transaction on the shared connection. */
export async function transaction(work: (db: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(() => work(db));
}

export type Db = SQLite.SQLiteDatabase;
export type SQLParam = string | number | null;
