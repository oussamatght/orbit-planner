export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/**
 * Ordered schema migrations. Never edit a shipped migration — append a new one instead.
 * The current schema version is stored in `PRAGMA user_version`.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT 'folder',
        color TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        sort_order REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        due_date TEXT,
        start_date TEXT,
        start_time TEXT,
        end_time TEXT,
        priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 0 AND 3),
        status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        recurrence TEXT,
        depends_on_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        sort_order REAL NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        sort_order REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS task_tags (
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        offset_minutes INTEGER NOT NULL DEFAULT 0,
        notification_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_reminders_task ON reminders(task_id);

      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT 'sparkles',
        color TEXT NOT NULL,
        frequency TEXT NOT NULL,
        target_per_day INTEGER NOT NULL DEFAULT 1,
        reminder_time TEXT,
        notification_ids TEXT NOT NULL DEFAULT '[]',
        archived INTEGER NOT NULL DEFAULT 0,
        sort_order REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS habit_completions (
        id TEXT PRIMARY KEY NOT NULL,
        habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        UNIQUE (habit_id, date)
      );

      CREATE TABLE IF NOT EXISTS focus_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        mode TEXT NOT NULL CHECK (mode IN ('focus', 'short_break', 'long_break')),
        planned_seconds INTEGER NOT NULL,
        actual_seconds INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_focus_started ON focus_sessions(started_at);

      CREATE TABLE IF NOT EXISTS notebooks (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'notebook',
        color TEXT NOT NULL,
        sort_order REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        notebook_id TEXT REFERENCES notebooks(id) ON DELETE SET NULL,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        color TEXT,
        pinned INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook_id);

      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;
