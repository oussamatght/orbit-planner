import { getDb } from '../database';
import type { PreferenceRow } from '../schema';

export const preferenceRepository = {
  async getAll(): Promise<Record<string, unknown>> {
    const db = await getDb();
    const rows = await db.getAllAsync<PreferenceRow>('SELECT * FROM preferences');
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        // Ignore a corrupted value; the default will be used instead.
      }
    }
    return result;
  },
  async set(key: string, value: unknown): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      JSON.stringify(value),
    );
  },
};
