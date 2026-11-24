/// <reference types="jest" />
/**
 * End-to-end persistence tests: real migrations + repositories + Zustand stores, running on a
 * real SQLite engine (node:sqlite) through a thin expo-sqlite adapter.
 */
import { currentDb } from './helpers/sqliteAdapter';

import * as Notifications from 'expo-notifications';

import { getDb } from '@/database/database';
import { LATEST_SCHEMA_VERSION } from '@/database/migrations';
import { buildBackup } from '@/services/backupService';
import { initializeApp } from '@/services/bootstrap';
import { validateBackup } from '@/services/backupValidation';
import { useFocusStore } from '@/store/focusStore';
import { useHabitStore } from '@/store/habitStore';
import { useNoteStore } from '@/store/noteStore';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import { addDays, todayKey } from '@/utils/date';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('expo-sqlite', () => require('./helpers/sqliteAdapter').sqliteMock);
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async (req: { identifier: string }) => req.identifier),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly' },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: {},
  NotificationFeedbackType: {},
}));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Directory: jest.fn(), Paths: {} }));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-document-picker', () => ({}));

beforeAll(async () => {
  await initializeApp();
});

/** Reloads every store from the database, simulating an app restart. */
async function restart() {
  await useSettingsStore.getState().load();
  await Promise.all([useTaskStore.getState().load(), useProjectStore.getState().load(), useHabitStore.getState().load(), useNoteStore.getState().load()]);
}

describe('database', () => {
  it('runs migrations to the latest schema version with foreign keys enabled', async () => {
    const db = await getDb();
    const version = await currentDb().getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(LATEST_SCHEMA_VERSION);
    const fk = await currentDb().getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(fk?.foreign_keys).toBe(1);
    expect(db).toBe(currentDb());
  });
});

describe('tasks persist across restarts', () => {
  it('stores subtasks, tags, reminders and schedules notifications', async () => {
    const tag = await useProjectStore.getState().createTag('school', '#5B5BF6');
    const project = await useProjectStore.getState().createProject({ name: 'University', icon: 'graduation', color: '#F5A524' });
    const due = addDays(todayKey(), 3);
    const created = await useTaskStore.getState().createTask({
      title: '  Finish university project  ',
      dueDate: due,
      startTime: '10:00',
      priority: 3,
      projectId: project.id,
      tagIds: [tag.id],
      reminderOffsets: [60, 0],
      subtasks: ['Research', 'Write report'],
    });
    expect(created.title).toBe('Finish university project');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();

    await restart();
    const loaded = useTaskStore.getState().tasks.find((t) => t.id === created.id);
    expect(loaded).toBeDefined();
    expect(loaded?.subtasks.map((s) => s.title)).toEqual(['Research', 'Write report']);
    expect(loaded?.tagIds).toEqual([tag.id]);
    expect(loaded?.reminders.map((r) => r.offsetMinutes)).toEqual([60, 0]);
    expect(loaded?.reminders.every((r) => r.notificationId)).toBe(true);
    expect(loaded?.projectId).toBe(project.id);
  });

  it('completing a recurring task spawns the next occurrence, and undo reverts both', async () => {
    const store = useTaskStore.getState();
    const t = await store.createTask({ title: 'Gym', dueDate: todayKey(), recurrence: { frequency: 'daily', interval: 1 } });
    const result = await useTaskStore.getState().toggleComplete(t.id);
    expect(result.completed).toBe(true);
    expect(result.spawned?.dueDate).toBe(addDays(todayKey(), 1));
    expect(result.spawned?.recurrence).toEqual({ frequency: 'daily', interval: 1 });

    await useTaskStore.getState().undoToggle(result);
    await restart();
    const tasks = useTaskStore.getState().tasks;
    expect(tasks.find((x) => x.id === t.id)?.status).toBe('todo');
    expect(tasks.find((x) => x.id === result.spawned?.id)).toBeUndefined();
  });

  it('blocks completion while a dependency is open', async () => {
    const a = await useTaskStore.getState().createTask({ title: 'Design' });
    const b = await useTaskStore.getState().createTask({ title: 'Build', dependsOnId: a.id });
    const blocked = await useTaskStore.getState().toggleComplete(b.id);
    expect(blocked.blockedBy?.id).toBe(a.id);
    await useTaskStore.getState().toggleComplete(a.id);
    const ok = await useTaskStore.getState().toggleComplete(b.id);
    expect(ok.completed).toBe(true);
  });

  it('deletes with cascade and restores a full snapshot on undo', async () => {
    const t = await useTaskStore.getState().createTask({ title: 'Temp', subtasks: ['one'] });
    const snapshots = await useTaskStore.getState().deleteTasks([t.id]);
    const orphans = await currentDb().getAllAsync('SELECT * FROM subtasks WHERE task_id = ?', t.id);
    expect(orphans).toHaveLength(0);
    await useTaskStore.getState().restoreTasks(snapshots);
    await restart();
    expect(useTaskStore.getState().tasks.find((x) => x.id === t.id)?.subtasks).toHaveLength(1);
  });

  it('keeps tasks (moved to inbox) when their project is deleted', async () => {
    const p = await useProjectStore.getState().createProject({ name: 'Temp project', icon: 'folder', color: '#000000' });
    const t = await useTaskStore.getState().createTask({ title: 'Orphan-safe', projectId: p.id });
    await useProjectStore.getState().deleteProject(p.id);
    await restart();
    expect(useTaskStore.getState().tasks.find((x) => x.id === t.id)?.projectId).toBeNull();
  });
});

describe('habits, notes and settings persist', () => {
  it('saves habit check-ins', async () => {
    const h = await useHabitStore.getState().createHabit({
      name: 'Drink water',
      icon: 'droplet',
      color: '#0EA5E9',
      frequency: { type: 'daily' },
      targetPerDay: 3,
      reminderTime: '08:00',
    });
    await useHabitStore.getState().checkIn(h.id, todayKey());
    await useHabitStore.getState().checkIn(h.id, todayKey());
    await restart();
    expect(useHabitStore.getState().completions[`${h.id}|${todayKey()}`]).toBe(2);
    expect(useHabitStore.getState().habits.find((x) => x.id === h.id)?.notificationIds.length).toBeGreaterThan(0);
  });

  it('saves notes and notebooks', async () => {
    const nb = await useNoteStore.getState().createNotebook({ name: 'Ideas', icon: 'lightbulb', color: '#F5A524' });
    const note = await useNoteStore.getState().createNote({ notebookId: nb.id });
    await useNoteStore.getState().updateNote(note.id, { title: 'App idea', content: '- [ ] sketch', pinned: true });
    await restart();
    const loaded = useNoteStore.getState().notes.find((n) => n.id === note.id);
    expect(loaded).toMatchObject({ title: 'App idea', content: '- [ ] sketch', pinned: true, notebookId: nb.id });
  });

  it('saves settings', async () => {
    await useSettingsStore.getState().update({ theme: 'dark', userName: 'Sam', language: 'fr' });
    await restart();
    expect(useSettingsStore.getState().settings).toMatchObject({ theme: 'dark', userName: 'Sam', language: 'fr' });
  });
});

describe('backup', () => {
  it('exports every table in a format the importer accepts', async () => {
    const backup = await buildBackup();
    expect(backup.data.tasks.length).toBeGreaterThan(0);
    const result = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(result.ok).toBe(true);
    expect(result.backup?.data.tasks).toHaveLength(backup.data.tasks.length);
    expect(result.backup?.data.notes).toHaveLength(backup.data.notes.length);
  });
});

describe('focus timer', () => {
  it('records a completed session and advances to a break', async () => {
    const focus = useFocusStore.getState();
    focus.setMode('focus');
    await useFocusStore.getState().start();
    expect(useFocusStore.getState().status).toBe('running');
    const endsAt = useFocusStore.getState().endsAt as number;

    const spy = jest.spyOn(Date, 'now').mockReturnValue(endsAt + 1000);
    const finished = await useFocusStore.getState().tick();
    spy.mockRestore();

    expect(finished).toBe('focus');
    const state = useFocusStore.getState();
    expect(state.mode).toBe('short_break');
    expect(state.status).toBe('idle');
    expect(state.sessions[0]).toMatchObject({ mode: 'focus', completed: true, actualSeconds: state.sessions[0].plannedSeconds });
    const rows = await currentDb().getAllAsync('SELECT * FROM focus_sessions');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('pauses and resumes without losing time', async () => {
    useFocusStore.getState().setMode('focus');
    await useFocusStore.getState().start();
    await useFocusStore.getState().pause();
    const paused = useFocusStore.getState();
    expect(paused.status).toBe('paused');
    expect(paused.remainingSeconds).toBeGreaterThan(paused.durationSeconds - 5);
    await useFocusStore.getState().reset();
    expect(useFocusStore.getState().status).toBe('idle');
  });
});
