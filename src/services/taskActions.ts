import { Alert } from 'react-native';

import { t } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore, type TaskPatch } from '@/store/taskStore';
import { toast } from '@/store/uiStore';
import type { Task, TaskInput } from '@/types/models';
import { formatDate } from '@/utils/date';
import { haptics } from '@/utils/haptics';

const store = () => useTaskStore.getState();

function fail(error: unknown): void {
  console.warn('[taskActions]', error);
  haptics.error();
  toast.error(t('error.saveFailed'));
}

export async function createTask(input: TaskInput, { silent = false } = {}): Promise<Task | null> {
  try {
    const task = await store().createTask(input);
    haptics.success();
    if (!silent) toast.success(t('task.created'));
    return task;
  } catch (error) {
    fail(error);
    return null;
  }
}

export async function updateTask(id: string, patch: TaskPatch): Promise<boolean> {
  try {
    await store().updateTask(id, patch);
    return true;
  } catch (error) {
    fail(error);
    return false;
  }
}

/** Toggles completion with haptics, dependency guard and an Undo toast. */
export async function toggleTask(id: string): Promise<void> {
  try {
    const result = await store().toggleComplete(id);
    if (result.blockedBy) {
      haptics.warning();
      toast.info(t('task.blocked', { title: result.blockedBy.title }));
      return;
    }
    if (!result.task) return;
    if (result.completed) haptics.success();
    else haptics.light();
    const language = useSettingsStore.getState().settings.language;
    const message =
      result.completed && result.spawned?.dueDate
        ? t('task.nextOccurrence', { date: formatDate(result.spawned.dueDate, language, { weekday: 'short', day: 'numeric', month: 'short' }) })
        : result.completed
          ? t('task.completed')
          : t('task.reopened');
    toast.success(message, { label: t('common.undo'), onPress: () => void store().undoToggle(result).catch(fail) });
  } catch (error) {
    fail(error);
  }
}

async function deleteNow(ids: string[]): Promise<void> {
  try {
    const snapshots = await store().deleteTasks(ids);
    haptics.medium();
    toast.success(ids.length === 1 ? t('task.deleted') : t('task.deletedMany', { count: ids.length }), {
      label: t('common.undo'),
      onPress: () => void store().restoreTasks(snapshots).catch(fail),
    });
  } catch (error) {
    fail(error);
  }
}

/**
 * Deletes tasks. Single deletes (e.g. swipe) happen immediately with Undo;
 * bulk deletes or `confirm: true` ask first.
 */
export function deleteTasks(ids: string[], { confirm = ids.length > 1 } = {}): Promise<boolean> {
  if (ids.length === 0) return Promise.resolve(false);
  if (!confirm) return deleteNow(ids).then(() => true);
  return new Promise((resolve) => {
    Alert.alert(
      ids.length === 1 ? t('task.deleteConfirm') : t('task.deleteManyConfirm', { count: ids.length }),
      t('task.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('common.delete'), style: 'destructive', onPress: () => void deleteNow(ids).then(() => resolve(true)) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export async function duplicateTask(id: string): Promise<Task | null> {
  try {
    const copy = await store().duplicateTask(id);
    haptics.light();
    toast.success(t('task.duplicated'));
    return copy;
  } catch (error) {
    fail(error);
    return null;
  }
}

export async function archiveCompleted(ids?: string[]): Promise<void> {
  try {
    const count = await store().archiveCompleted(ids);
    if (count > 0) {
      haptics.success();
      toast.success(t('task.archived', { count }));
    }
  } catch (error) {
    fail(error);
  }
}

export async function bulkUpdate(ids: string[], patch: TaskPatch): Promise<void> {
  try {
    await store().bulkUpdate(ids, patch);
    haptics.success();
    toast.success(t('task.saved'));
  } catch (error) {
    fail(error);
  }
}

export async function bulkComplete(ids: string[]): Promise<void> {
  const open = store().tasks.filter((x) => ids.includes(x.id) && x.status !== 'done');
  try {
    for (const task of open) await store().toggleComplete(task.id);
    haptics.success();
    toast.success(t('task.saved'));
  } catch (error) {
    fail(error);
  }
}
