import { TABLES, type TableName, type TableRows } from '@/database/schema';

/** Column type spec used to validate imported rows. `?` suffix = nullable. */
type ColumnType = 'string' | 'number' | 'string?' | 'number?';

export const TABLE_COLUMNS: Record<TableName, Record<string, ColumnType>> = {
  projects: {
    id: 'string', name: 'string', description: 'string', icon: 'string', color: 'string',
    archived: 'number', sort_order: 'number', created_at: 'string', updated_at: 'string',
  },
  categories: { id: 'string', name: 'string', color: 'string', created_at: 'string' },
  tags: { id: 'string', name: 'string', color: 'string', created_at: 'string' },
  tasks: {
    id: 'string', title: 'string', description: 'string', notes: 'string', due_date: 'string?',
    start_date: 'string?', start_time: 'string?', end_time: 'string?', priority: 'number', status: 'string',
    project_id: 'string?', category_id: 'string?', recurrence: 'string?', depends_on_id: 'string?',
    sort_order: 'number', archived: 'number', created_at: 'string', updated_at: 'string', completed_at: 'string?',
  },
  subtasks: { id: 'string', task_id: 'string', title: 'string', completed: 'number', sort_order: 'number', created_at: 'string' },
  task_tags: { task_id: 'string', tag_id: 'string' },
  reminders: { id: 'string', task_id: 'string', offset_minutes: 'number', notification_id: 'string?', created_at: 'string' },
  habits: {
    id: 'string', name: 'string', description: 'string', icon: 'string', color: 'string', frequency: 'string',
    target_per_day: 'number', reminder_time: 'string?', notification_ids: 'string', archived: 'number',
    sort_order: 'number', created_at: 'string',
  },
  habit_completions: { id: 'string', habit_id: 'string', date: 'string', count: 'number' },
  focus_sessions: {
    id: 'string', task_id: 'string?', mode: 'string', planned_seconds: 'number', actual_seconds: 'number',
    started_at: 'string', ended_at: 'string', completed: 'number',
  },
  notebooks: { id: 'string', name: 'string', icon: 'string', color: 'string', sort_order: 'number', created_at: 'string' },
  notes: {
    id: 'string', notebook_id: 'string?', title: 'string', content: 'string', color: 'string?', pinned: 'number',
    archived: 'number', created_at: 'string', updated_at: 'string',
  },
  preferences: { key: 'string', value: 'string' },
};

export const BACKUP_APP_ID = 'orbit-productivity';
export const BACKUP_FORMAT = 1;

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  format: number;
  schemaVersion: number;
  exportedAt: string;
  data: TableRows;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  backup?: BackupFile;
}

function matches(value: unknown, type: ColumnType): boolean {
  const nullable = type.endsWith('?');
  if (value === null || value === undefined) return nullable;
  const base = nullable ? type.slice(0, -1) : type;
  if (base === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === 'string';
}

/**
 * Validates an untrusted backup payload. Only whitelisted columns are kept, so the result is
 * safe to write with column names taken from `TABLE_COLUMNS`.
 */
export function validateBackup(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'not an object' };
  const r = raw as Record<string, unknown>;
  if (r.app !== BACKUP_APP_ID) return { ok: false, error: 'wrong app identifier' };
  if (typeof r.format !== 'number' || r.format > BACKUP_FORMAT) return { ok: false, error: 'unsupported format version' };
  if (!r.data || typeof r.data !== 'object') return { ok: false, error: 'missing data' };
  const data = r.data as Record<string, unknown>;

  const clean = {} as Record<TableName, Record<string, unknown>[]>;
  for (const table of TABLES) {
    const rows = data[table] ?? [];
    if (!Array.isArray(rows)) return { ok: false, error: `${table} is not a list` };
    if (rows.length > 200_000) return { ok: false, error: `${table} is too large` };
    const spec = TABLE_COLUMNS[table];
    const out: Record<string, unknown>[] = [];
    for (const [index, row] of rows.entries()) {
      if (!row || typeof row !== 'object') return { ok: false, error: `${table}[${index}] is not an object` };
      const source = row as Record<string, unknown>;
      const cleaned: Record<string, unknown> = {};
      for (const [column, type] of Object.entries(spec)) {
        const value = source[column];
        if (!matches(value, type)) return { ok: false, error: `${table}[${index}].${column} is invalid` };
        cleaned[column] = value ?? null;
      }
      out.push(cleaned);
    }
    clean[table] = out;
  }

  // Referential integrity: drop rows that point to missing parents instead of failing the import.
  const ids = (table: TableName) => new Set(clean[table].map((row) => row.id as string));
  const taskIds = ids('tasks');
  const tagIds = ids('tags');
  const habitIds = ids('habits');
  const projectIds = ids('projects');
  const categoryIds = ids('categories');
  const notebookIds = ids('notebooks');
  clean.subtasks = clean.subtasks.filter((r) => taskIds.has(r.task_id as string));
  clean.reminders = clean.reminders.filter((r) => taskIds.has(r.task_id as string));
  clean.task_tags = clean.task_tags.filter((r) => taskIds.has(r.task_id as string) && tagIds.has(r.tag_id as string));
  clean.habit_completions = clean.habit_completions.filter((r) => habitIds.has(r.habit_id as string));
  for (const task of clean.tasks) {
    if (task.project_id && !projectIds.has(task.project_id as string)) task.project_id = null;
    if (task.category_id && !categoryIds.has(task.category_id as string)) task.category_id = null;
    if (task.depends_on_id && !taskIds.has(task.depends_on_id as string)) task.depends_on_id = null;
  }
  for (const s of clean.focus_sessions) if (s.task_id && !taskIds.has(s.task_id as string)) s.task_id = null;
  for (const n of clean.notes) if (n.notebook_id && !notebookIds.has(n.notebook_id as string)) n.notebook_id = null;
  // Notification ids from another device/install are meaningless here.
  for (const r of clean.reminders) r.notification_id = null;
  for (const h of clean.habits) h.notification_ids = '[]';

  return {
    ok: true,
    backup: {
      app: BACKUP_APP_ID,
      format: r.format,
      schemaVersion: typeof r.schemaVersion === 'number' ? r.schemaVersion : 1,
      exportedAt: typeof r.exportedAt === 'string' ? r.exportedAt : new Date().toISOString(),
      data: clean as unknown as TableRows,
    },
  };
}
