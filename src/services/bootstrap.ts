import { getDb } from '@/database/database';
import { useFocusStore } from '@/store/focusStore';
import { useHabitStore } from '@/store/habitStore';
import { useNoteStore } from '@/store/noteStore';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

import { configureNotifications, scheduleTaskNotifications } from './notificationService';

/** Opens the database and hydrates every store. Settings load first so other stores can read them. */
export async function initializeApp(): Promise<void> {
  await getDb();
  await useSettingsStore.getState().load();
  await Promise.all([
    useProjectStore.getState().load(),
    useTaskStore.getState().load(),
    useHabitStore.getState().load(),
    useNoteStore.getState().load(),
  ]);
  await useFocusStore.getState().load();
  configureNotifications().catch(() => undefined);
}

export async function reloadAllStores({ reschedule }: { reschedule: boolean }): Promise<void> {
  await initializeApp();
  if (reschedule) await rescheduleAllNotifications();
}

/** Re-creates every task and habit notification, e.g. after a restore or a settings change. */
export async function rescheduleAllNotifications(): Promise<void> {
  const tasks = useTaskStore.getState().tasks.filter((t) => !t.archived && t.status !== 'done' && t.dueDate);
  for (const task of tasks) {
    try {
      const reminders = await scheduleTaskNotifications(task);
      useTaskStore.setState((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, reminders } : t)) }));
    } catch {
      // continue with the next task
    }
  }
  await useHabitStore.getState().rescheduleAll();
}
