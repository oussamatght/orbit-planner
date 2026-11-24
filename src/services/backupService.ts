import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getDb, transaction } from '@/database/database';
import { LATEST_SCHEMA_VERSION } from '@/database/migrations';
import { TABLES, type TableName, type TableRows } from '@/database/schema';
import { todayKey } from '@/utils/date';

import { BACKUP_APP_ID, BACKUP_FORMAT, TABLE_COLUMNS, validateBackup, type BackupFile } from './backupValidation';
import { reloadAllStores } from './bootstrap';
import { cancelAllNotifications } from './notificationService';

export async function buildBackup(): Promise<BackupFile> {
  const db = await getDb();
  const data = {} as Record<TableName, unknown[]>;
  for (const table of TABLES) data[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  return {
    app: BACKUP_APP_ID,
    format: BACKUP_FORMAT,
    schemaVersion: LATEST_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: data as unknown as TableRows,
  };
}

function writeJson(directory: Directory, name: string, payload: unknown): File {
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, name);
  file.create({ overwrite: true });
  file.write(JSON.stringify(payload, null, 2));
  return file;
}

/** Keeps a copy of the current data in the app's private documents folder (last 5 kept). */
async function writeSafetyBackup(reason: string): Promise<void> {
  const backup = await buildBackup();
  const dir = new Directory(Paths.document, 'backups');
  writeJson(dir, `auto-${reason}-${Date.now()}.json`, backup);
  const autos = dir
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.startsWith('auto-'))
    .sort((a, b) => b.name.localeCompare(a.name));
  for (const old of autos.slice(5)) {
    try {
      old.delete();
    } catch {
      // Not critical.
    }
  }
}

export type ExportResult = 'shared' | 'saved';

export async function exportBackup(): Promise<ExportResult> {
  const backup = await buildBackup();
  const name = `orbit-backup-${todayKey()}.json`;
  const file = writeJson(new Directory(Paths.cache, 'exports'), name, backup);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: name, UTI: 'public.json' });
    return 'shared';
  }
  writeJson(new Directory(Paths.document, 'backups'), name, backup);
  return 'saved';
}

export interface ImportPreview {
  backup: BackupFile;
  counts: { tasks: number; projects: number; habits: number; notes: number };
}

export type PickResult = { status: 'canceled' } | { status: 'invalid'; reason: string } | { status: 'ok'; preview: ImportPreview };

/** Lets the user pick a backup file and validates it without touching existing data. */
export async function pickBackup(): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return { status: 'canceled' };
  const text = await new File(result.assets[0].uri).text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: 'invalid', reason: 'not JSON' };
  }
  const validation = validateBackup(parsed);
  if (!validation.ok || !validation.backup) return { status: 'invalid', reason: validation.error ?? 'invalid' };
  const { data } = validation.backup;
  return {
    status: 'ok',
    preview: {
      backup: validation.backup,
      counts: { tasks: data.tasks.length, projects: data.projects.length, habits: data.habits.length, notes: data.notes.length },
    },
  };
}

async function wipeTables(keepPreferences: boolean): Promise<void> {
  await transaction(async (db) => {
    for (const table of [...TABLES].reverse()) {
      if (keepPreferences && table === 'preferences') continue;
      await db.runAsync(`DELETE FROM ${table}`);
    }
  });
}

/** Replaces all local data with a validated backup, atomically. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  await writeSafetyBackup('before-import');
  await cancelAllNotifications();
  await transaction(async (db) => {
    for (const table of [...TABLES].reverse()) await db.runAsync(`DELETE FROM ${table}`);
    for (const table of TABLES) {
      const columns = Object.keys(TABLE_COLUMNS[table]);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      const rows = backup.data[table] as unknown as Record<string, string | number | null>[];
      for (const row of rows) {
        // Dependencies between tasks are linked after all tasks exist.
        const values = columns.map((c) => (table === 'tasks' && c === 'depends_on_id' ? null : row[c] ?? null));
        await db.runAsync(sql, values);
      }
    }
    for (const task of backup.data.tasks) {
      if (task.depends_on_id) await db.runAsync('UPDATE tasks SET depends_on_id = ? WHERE id = ?', task.depends_on_id, task.id);
    }
  });
  await reloadAllStores({ reschedule: true });
}

/** Deletes all user content. Preferences (theme, language, name) are kept. */
export async function clearAllData(): Promise<void> {
  await writeSafetyBackup('before-clear');
  await cancelAllNotifications();
  await wipeTables(true);
  await reloadAllStores({ reschedule: false });
}
