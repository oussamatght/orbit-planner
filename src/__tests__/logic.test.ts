/// <reference types="jest" />
// Pure-logic tests; the database module is never opened here.

import { en } from '@/i18n/en';
import { ar } from '@/i18n/ar';
import { fr } from '@/i18n/fr';
import { translate } from '@/i18n';
import { validateBackup, BACKUP_APP_ID } from '@/services/backupValidation';
import { completedByDay, completionRateFor, openByPriority, productiveStreak } from '@/services/statisticsService';
import { DEFAULT_SETTINGS, sanitizeSettings } from '@/store/settingsStore';
import type { Habit, Task } from '@/types/models';
import { addDays, addMonths, diffInDays, isValidDateKey, isValidTime, monthGrid, startOfWeek, timeToMinutes, minutesToTime } from '@/utils/date';
import { completionRate, isScheduledOn, streaks } from '@/utils/habitStats';
import { checklistProgress, parseNote, toggleChecklistLine } from '@/utils/noteContent';
import { isValidRecurrence, nextOccurrence } from '@/utils/recurrence';
import { filterTasks, isInbox, searchTasks, sortTasks } from '@/utils/taskFilters';

jest.mock('expo-sqlite', () => ({}));
jest.mock('expo-notifications', () => ({}));
jest.mock('expo-haptics', () => ({}));

const TODAY = '2026-11-20'; // a Friday

function task(partial: Partial<Task>): Task {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    title: 'Task',
    description: '',
    notes: '',
    dueDate: null,
    startDate: null,
    startTime: null,
    endTime: null,
    priority: 1,
    status: 'todo',
    projectId: null,
    categoryId: null,
    recurrence: null,
    dependsOnId: null,
    sortOrder: 0,
    archived: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    completedAt: null,
    subtasks: [],
    tagIds: [],
    reminders: [],
    ...partial,
  };
}

describe('date utils', () => {
  it('adds days and months with month-end clamping', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(diffInDays('2026-11-27', TODAY)).toBe(7);
  });

  it('validates keys and times', () => {
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('2026-02-28')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('23:59')).toBe(true);
    expect(minutesToTime(timeToMinutes('09:45'))).toBe('09:45');
  });

  it('computes week starts and a 6-week month grid', () => {
    expect(startOfWeek(TODAY, 1)).toBe('2026-11-16');
    expect(startOfWeek(TODAY, 0)).toBe('2026-11-15');
    const grid = monthGrid(TODAY, 1);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-10-26');
  });
});

describe('recurrence', () => {
  it('handles daily, monthly and yearly intervals', () => {
    expect(nextOccurrence(TODAY, { frequency: 'daily', interval: 2 })).toBe('2026-11-22');
    expect(nextOccurrence('2026-01-31', { frequency: 'monthly', interval: 1 })).toBe('2026-02-28');
    expect(nextOccurrence('2024-02-29', { frequency: 'yearly', interval: 1 })).toBe('2025-02-28');
  });

  it('picks the next selected weekday, honouring the interval across weeks', () => {
    // Friday -> next Monday/Wednesday rule
    expect(nextOccurrence(TODAY, { frequency: 'weekly', interval: 1, weekdays: [1, 3] })).toBe('2026-11-23');
    // Monday with Mon/Wed rule -> Wednesday same week
    expect(nextOccurrence('2026-11-23', { frequency: 'weekly', interval: 1, weekdays: [1, 3] })).toBe('2026-11-25');
    // Every 2 weeks on Monday, from a Monday -> two weeks later
    expect(nextOccurrence('2026-11-23', { frequency: 'weekly', interval: 2, weekdays: [1] })).toBe('2026-12-07');
    // Weekly without weekdays -> +7 days
    expect(nextOccurrence(TODAY, { frequency: 'weekly', interval: 1 })).toBe('2026-11-27');
  });

  it('rejects malformed rules', () => {
    expect(isValidRecurrence({ frequency: 'hourly', interval: 1 })).toBe(false);
    expect(isValidRecurrence({ frequency: 'weekly', interval: 0 })).toBe(false);
    expect(isValidRecurrence({ frequency: 'weekly', interval: 1, weekdays: [8] })).toBe(false);
    expect(isValidRecurrence({ frequency: 'daily', interval: 3 })).toBe(true);
  });
});

describe('task filters', () => {
  const tasks = [
    task({ id: 'overdue', dueDate: '2026-11-18', priority: 3 }),
    task({ id: 'today', dueDate: TODAY, startTime: '09:00' }),
    task({ id: 'upcoming', dueDate: '2026-11-25', title: 'Alpha' }),
    task({ id: 'inbox', title: 'Buy milk', tagIds: ['t1'] }),
    task({ id: 'done', dueDate: TODAY, status: 'done', completedAt: '2026-11-20T08:00:00.000Z' }),
    task({ id: 'archived', status: 'done', archived: true }),
  ];

  it('filters by view', () => {
    const ids = (f: Parameters<typeof filterTasks>[1]) => filterTasks(tasks, f, TODAY).map((t) => t.id);
    expect(ids('overdue')).toEqual(['overdue']);
    expect(ids('today').sort()).toEqual(['done', 'today']);
    expect(ids('upcoming')).toEqual(['upcoming']);
    expect(ids('unscheduled')).toEqual(['inbox']);
    expect(ids('high')).toEqual(['overdue']);
    expect(ids('completed')).toEqual(['done']);
    expect(ids('archived')).toEqual(['archived']);
    expect(ids('all')).not.toContain('archived');
  });

  it('identifies inbox tasks and searches tags', () => {
    expect(tasks.filter(isInbox).map((t) => t.id)).toEqual(['inbox']);
    expect(searchTasks(tasks, '#errand', [{ id: 't1', name: 'errand', color: '#000', createdAt: '' }]).map((t) => t.id)).toEqual(['inbox']);
    expect(searchTasks(tasks, 'milk', []).map((t) => t.id)).toEqual(['inbox']);
  });

  it('sorts with completed tasks last', () => {
    const byPriority = sortTasks(tasks.filter((t) => !t.archived), 'priority').map((t) => t.id);
    expect(byPriority[0]).toBe('overdue');
    expect(byPriority[byPriority.length - 1]).toBe('done');
    expect(sortTasks(tasks, 'alpha')[0].title).toBe('Alpha');
  });
});

describe('habit statistics', () => {
  const habit: Habit = {
    id: 'h',
    name: 'Read',
    description: '',
    icon: 'book',
    color: '#000',
    frequency: { type: 'daily' },
    targetPerDay: 1,
    reminderTime: null,
    notificationIds: [],
    archived: false,
    sortOrder: 0,
    createdAt: '2026-11-01T08:00:00',
  };

  it('counts a current streak that tolerates an unfinished today', () => {
    const done = new Set(['2026-11-17', '2026-11-18', '2026-11-19']);
    const lookup = (_: string, d: string) => (done.has(d) ? 1 : 0);
    expect(streaks(habit, TODAY, lookup, 1)).toEqual({ current: 3, best: 3, unit: 'days' });
    done.add(TODAY);
    expect(streaks(habit, TODAY, lookup, 1).current).toBe(4);
  });

  it('skips unscheduled days for weekday habits', () => {
    const weekdays: Habit = { ...habit, frequency: { type: 'weekdays', days: [1, 3, 5] } };
    expect(isScheduledOn(weekdays, '2026-11-19')).toBe(false); // Thursday
    const done = new Set(['2026-11-16', '2026-11-18', TODAY]); // Mon, Wed, Fri
    expect(streaks(weekdays, TODAY, (_, d) => (done.has(d) ? 1 : 0), 1).current).toBe(3);
    expect(completionRate(weekdays, TODAY, 7, (_, d) => (done.has(d) ? 1 : 0))).toBe(1);
  });
});

describe('statistics', () => {
  const tasks = [
    task({ status: 'done', completedAt: '2026-11-20T09:00:00', dueDate: TODAY }),
    task({ status: 'done', completedAt: '2026-11-19T09:00:00', dueDate: '2026-11-19' }),
    task({ dueDate: '2026-11-19', priority: 3 }),
  ];
  it('aggregates completions, rate, streak and priorities', () => {
    expect(completedByDay(tasks, '2026-11-19', 2).map((d) => d.value)).toEqual([1, 1]);
    expect(completionRateFor(tasks, TODAY, 7)).toBeCloseTo(2 / 3);
    expect(productiveStreak(tasks, TODAY)).toBe(2);
    expect(openByPriority(tasks)).toEqual([0, 0, 0, 1]);
  });
});

describe('notes checklist', () => {
  it('parses and toggles checklist lines', () => {
    const content = 'Groceries\n- [ ] eggs\n- [x] milk';
    expect(parseNote(content).filter((l) => l.kind === 'check')).toHaveLength(2);
    expect(checklistProgress(content)).toEqual({ done: 1, total: 2 });
    expect(toggleChecklistLine(content, 1)).toBe('Groceries\n- [x] eggs\n- [x] milk');
  });
});

describe('settings', () => {
  it('falls back to defaults for malformed values', () => {
    expect(sanitizeSettings({ language: 'ar' }).language).toBe('ar');
    const s = sanitizeSettings({ theme: 'neon', focusMinutes: 9999, language: 'fr', weekStartsOn: 3 });
    expect(s.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(s.focusMinutes).toBe(180);
    expect(s.language).toBe('fr');
    expect(s.weekStartsOn).toBe(DEFAULT_SETTINGS.weekStartsOn);
  });
});

describe('i18n', () => {
  it('has a French string for every English key and interpolates params', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(ar).every((v) => v.trim().length > 0)).toBe(true);
    expect(translate('ar', 'today.progressSome', { done: 2, total: 5 })).toBe('أنجزت 2 من 5 مهام');
    expect(translate('en', 'today.progressSome', { done: 2, total: 5 })).toBe('2 of 5 tasks done');
    expect(translate('fr', 'common.save')).toBe('Enregistrer');
  });
});

describe('backup validation', () => {
  const base = () => ({
    app: BACKUP_APP_ID,
    format: 1,
    schemaVersion: 1,
    exportedAt: '2026-11-20T00:00:00.000Z',
    data: {
      projects: [],
      tasks: [
        {
          id: 't1', title: 'A', description: '', notes: '', due_date: null, start_date: null, start_time: null, end_time: null,
          priority: 1, status: 'todo', project_id: 'missing', category_id: null, recurrence: null, depends_on_id: null,
          sort_order: 0, archived: 0, created_at: 'x', updated_at: 'x', completed_at: null, injected_column: 'DROP TABLE',
        },
      ],
      subtasks: [{ id: 's1', task_id: 'ghost', title: 'orphan', completed: 0, sort_order: 0, created_at: 'x' }],
    },
  });

  it('accepts a valid backup, strips unknown columns and fixes dangling references', () => {
    const result = validateBackup(base());
    expect(result.ok).toBe(true);
    const task0 = result.backup?.data.tasks[0] as unknown as Record<string, unknown>;
    expect(task0.injected_column).toBeUndefined();
    expect(task0.project_id).toBeNull();
    expect(result.backup?.data.subtasks).toHaveLength(0);
  });

  it('rejects other apps, newer formats and wrong types', () => {
    expect(validateBackup({ ...base(), app: 'other' }).ok).toBe(false);
    expect(validateBackup({ ...base(), format: 99 }).ok).toBe(false);
    const bad = base();
    (bad.data.tasks[0] as Record<string, unknown>).priority = 'high';
    expect(validateBackup(bad).ok).toBe(false);
    expect(validateBackup('nonsense').ok).toBe(false);
  });
});
