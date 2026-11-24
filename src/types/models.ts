/** Calendar date in local time, formatted `YYYY-MM-DD`. */
export type DateKey = string;
/** Local time of day, formatted `HH:mm`. */
export type TimeOfDay = string;
/** ISO-8601 timestamp. */
export type IsoDateTime = string;

export type Priority = 0 | 1 | 2 | 3;
export const PRIORITIES: readonly Priority[] = [0, 1, 2, 3];
export type PriorityKey = 'low' | 'medium' | 'high' | 'urgent';
export const PRIORITY_KEYS: Record<Priority, PriorityKey> = { 0: 'low', 1: 'medium', 2: 'high', 3: 'urgent' };

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  /** Repeat every N units (>= 1). */
  interval: number;
  /** For weekly rules: weekdays 0 (Sunday) – 6 (Saturday). Empty means "same weekday as the due date". */
  weekdays?: number[];
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  createdAt: IsoDateTime;
}

export interface Reminder {
  id: string;
  taskId: string;
  /** Minutes before the task's scheduled moment (0 = at time). */
  offsetMinutes: number;
  notificationId: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  notes: string;
  dueDate: DateKey | null;
  startDate: DateKey | null;
  startTime: TimeOfDay | null;
  endTime: TimeOfDay | null;
  priority: Priority;
  status: TaskStatus;
  projectId: string | null;
  categoryId: string | null;
  recurrence: Recurrence | null;
  dependsOnId: string | null;
  sortOrder: number;
  archived: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  completedAt: IsoDateTime | null;
  subtasks: Subtask[];
  tagIds: string[];
  reminders: Reminder[];
}

/** Fields accepted when creating or updating a task. */
export interface TaskInput {
  title: string;
  description?: string;
  notes?: string;
  dueDate?: DateKey | null;
  startDate?: DateKey | null;
  startTime?: TimeOfDay | null;
  endTime?: TimeOfDay | null;
  priority?: Priority;
  status?: TaskStatus;
  projectId?: string | null;
  categoryId?: string | null;
  recurrence?: Recurrence | null;
  dependsOnId?: string | null;
  tagIds?: string[];
  reminderOffsets?: number[];
  subtasks?: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  archived: boolean;
  sortOrder: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: IsoDateTime;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: IsoDateTime;
}

export type HabitFrequency =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] }
  | { type: 'weekly'; timesPerWeek: number };

export interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  /** How many check-ins complete the habit for a day (e.g. 8 glasses of water). */
  targetPerDay: number;
  reminderTime: TimeOfDay | null;
  notificationIds: string[];
  archived: boolean;
  sortOrder: number;
  createdAt: IsoDateTime;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: DateKey;
  count: number;
}

export type FocusMode = 'focus' | 'short_break' | 'long_break';

export interface FocusSession {
  id: string;
  taskId: string | null;
  mode: FocusMode;
  plannedSeconds: number;
  actualSeconds: number;
  startedAt: IsoDateTime;
  endedAt: IsoDateTime;
  completed: boolean;
}

export interface Notebook {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: IsoDateTime;
}

export interface Note {
  id: string;
  notebookId: string | null;
  title: string;
  content: string;
  color: string | null;
  pinned: boolean;
  archived: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type ThemeMode = 'system' | 'light' | 'dark';
export type Language = 'en' | 'fr' | 'ar';

export interface AppSettings {
  onboarded: boolean;
  userName: string;
  theme: ThemeMode;
  language: Language;
  /** 0 = Sunday, 1 = Monday, 6 = Saturday. */
  weekStartsOn: 0 | 1 | 6;
  notificationsEnabled: boolean;
  taskRemindersEnabled: boolean;
  habitRemindersEnabled: boolean;
  focusNotificationsEnabled: boolean;
  deadlineAlertsEnabled: boolean;
  defaultPriority: Priority;
  /** Default reminder offset in minutes, or null for none. */
  defaultReminder: number | null;
  /** Time used for reminders on tasks that only have a date. */
  defaultReminderTime: TimeOfDay;
  hapticsEnabled: boolean;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  dailyFocusGoalMinutes: number;
}
