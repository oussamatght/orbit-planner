/** Raw row shapes as stored in SQLite (snake_case, integers for booleans, JSON as text). */

export interface ProjectRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TagRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskRow {
  id: string;
  title: string;
  description: string;
  notes: string;
  due_date: string | null;
  start_date: string | null;
  start_time: string | null;
  end_time: string | null;
  priority: number;
  status: string;
  project_id: string | null;
  category_id: string | null;
  recurrence: string | null;
  depends_on_id: string | null;
  sort_order: number;
  archived: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  completed: number;
  sort_order: number;
  created_at: string;
}

export interface TaskTagRow {
  task_id: string;
  tag_id: string;
}

export interface ReminderRow {
  id: string;
  task_id: string;
  offset_minutes: number;
  notification_id: string | null;
  created_at: string;
}

export interface HabitRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  frequency: string;
  target_per_day: number;
  reminder_time: string | null;
  notification_ids: string;
  archived: number;
  sort_order: number;
  created_at: string;
}

export interface HabitCompletionRow {
  id: string;
  habit_id: string;
  date: string;
  count: number;
}

export interface FocusSessionRow {
  id: string;
  task_id: string | null;
  mode: string;
  planned_seconds: number;
  actual_seconds: number;
  started_at: string;
  ended_at: string;
  completed: number;
}

export interface NotebookRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface NoteRow {
  id: string;
  notebook_id: string | null;
  title: string;
  content: string;
  color: string | null;
  pinned: number;
  archived: number;
  created_at: string;
  updated_at: string;
}

export interface PreferenceRow {
  key: string;
  value: string;
}

/** Every table in dependency order (parents before children) — used by backup/restore. */
export const TABLES = [
  'projects',
  'categories',
  'tags',
  'tasks',
  'subtasks',
  'task_tags',
  'reminders',
  'habits',
  'habit_completions',
  'focus_sessions',
  'notebooks',
  'notes',
  'preferences',
] as const;

export type TableName = (typeof TABLES)[number];

export interface TableRows {
  projects: ProjectRow[];
  categories: CategoryRow[];
  tags: TagRow[];
  tasks: TaskRow[];
  subtasks: SubtaskRow[];
  task_tags: TaskTagRow[];
  reminders: ReminderRow[];
  habits: HabitRow[];
  habit_completions: HabitCompletionRow[];
  focus_sessions: FocusSessionRow[];
  notebooks: NotebookRow[];
  notes: NoteRow[];
  preferences: PreferenceRow[];
}
