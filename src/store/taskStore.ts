import { create } from 'zustand';

import { taskRepository } from '@/database/repositories';
import { cancelTaskNotifications, scheduleTaskNotifications } from '@/services/notificationService';
import type { Reminder, Subtask, Task, TaskInput } from '@/types/models';
import { addDays, diffInDays, nowIso, todayKey } from '@/utils/date';
import { createId } from '@/utils/id';
import { nextOccurrence } from '@/utils/recurrence';

import { useSettingsStore } from './settingsStore';

export type TaskPatch = Partial<
  Pick<
    Task,
    | 'title'
    | 'description'
    | 'notes'
    | 'dueDate'
    | 'startDate'
    | 'startTime'
    | 'endTime'
    | 'priority'
    | 'status'
    | 'projectId'
    | 'categoryId'
    | 'recurrence'
    | 'dependsOnId'
    | 'archived'
    | 'subtasks'
    | 'tagIds'
    | 'sortOrder'
  >
> & { reminderOffsets?: number[] };

export interface ToggleResult {
  task: Task | null;
  completed: boolean;
  spawned: Task | null;
  blockedBy: Task | null;
}

interface TaskState {
  tasks: Task[];
  loaded: boolean;
  load: () => Promise<void>;
  createTask: (input: TaskInput) => Promise<Task>;
  updateTask: (id: string, patch: TaskPatch) => Promise<Task | null>;
  bulkUpdate: (ids: string[], patch: TaskPatch) => Promise<void>;
  deleteTasks: (ids: string[]) => Promise<Task[]>;
  restoreTasks: (snapshots: Task[]) => Promise<void>;
  toggleComplete: (id: string) => Promise<ToggleResult>;
  undoToggle: (result: ToggleResult) => Promise<void>;
  duplicateTask: (id: string) => Promise<Task | null>;
  archiveCompleted: (ids?: string[]) => Promise<number>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  removeSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  moveTask: (id: string, direction: -1 | 1, visibleIds: string[]) => Promise<void>;
}

const MAX_TITLE = 200;

function buildReminders(taskId: string, offsets: number[], existing: Reminder[] = []): Reminder[] {
  const unique = [...new Set(offsets.filter((o) => Number.isFinite(o) && o >= 0))].sort((a, b) => b - a);
  return unique.map((offset) => {
    const prev = existing.find((r) => r.offsetMinutes === offset);
    return prev ?? { id: createId(), taskId, offsetMinutes: offset, notificationId: null };
  });
}

function nextSortOrder(tasks: Task[]): number {
  return tasks.reduce((max, t) => Math.max(max, t.sortOrder), 0) + 1;
}

function applyPatch(task: Task, patch: TaskPatch): Task {
  const { reminderOffsets, ...rest } = patch;
  const next: Task = { ...task, ...rest, updatedAt: nowIso() };
  if (rest.title !== undefined) next.title = rest.title.trim().slice(0, MAX_TITLE) || task.title;
  if (rest.status !== undefined && rest.status !== task.status) {
    next.completedAt = rest.status === 'done' ? nowIso() : null;
  }
  // Reminders are kept when the date is removed; the scheduler simply skips tasks without a date.
  if (reminderOffsets !== undefined) next.reminders = buildReminders(task.id, reminderOffsets, task.reminders);
  if (next.dependsOnId === next.id) next.dependsOnId = null;
  return next;
}

/** Persists tasks, then (re)schedules their notifications and stores the resulting ids. */
async function persist(tasks: Task[], set: (fn: (s: TaskState) => Partial<TaskState>) => void): Promise<void> {
  await taskRepository.save(tasks);
  for (const task of tasks) {
    try {
      const reminders = await scheduleTaskNotifications(task);
      const changed = reminders.some((r, i) => r.notificationId !== task.reminders[i]?.notificationId);
      if (!changed) continue;
      await Promise.all(reminders.map((r) => taskRepository.setReminderNotificationId(r.id, r.notificationId)));
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, reminders } : t)) }));
    } catch {
      // Notifications are best-effort; the task itself has been saved.
    }
  }
}

export const useTaskStore = create<TaskState>((set, get) => {
  /** Optimistically replaces tasks in state, persists, and rolls back on failure. */
  async function commit(changed: Task[], removedIds: string[] = []): Promise<void> {
    const previous = get().tasks;
    const map = new Map(previous.map((t) => [t.id, t]));
    for (const id of removedIds) map.delete(id);
    for (const t of changed) map.set(t.id, t);
    set({ tasks: [...map.values()] });
    try {
      if (removedIds.length) {
        const removed = previous.filter((t) => removedIds.includes(t.id));
        await Promise.all(removed.map((t) => cancelTaskNotifications(t)));
        await taskRepository.remove(removedIds);
      }
      if (changed.length) await persist(changed, set);
    } catch (error) {
      set({ tasks: previous });
      throw error;
    }
  }

  return {
    tasks: [],
    loaded: false,

    load: async () => {
      const tasks = await taskRepository.getAll();
      set({ tasks, loaded: true });
    },

    createTask: async (input) => {
      const title = input.title.trim().slice(0, MAX_TITLE);
      if (!title) throw new Error('Task title is required');
      const id = createId();
      const now = nowIso();
      const settings = useSettingsStore.getState().settings;
      const offsets = input.reminderOffsets ?? (input.dueDate && settings.defaultReminder !== null ? [settings.defaultReminder] : []);
      const task: Task = {
        id,
        title,
        description: input.description?.trim() ?? '',
        notes: input.notes ?? '',
        dueDate: input.dueDate ?? null,
        startDate: input.startDate ?? null,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        priority: input.priority ?? settings.defaultPriority,
        status: input.status ?? 'todo',
        projectId: input.projectId ?? null,
        categoryId: input.categoryId ?? null,
        recurrence: input.recurrence ?? null,
        dependsOnId: input.dependsOnId ?? null,
        sortOrder: nextSortOrder(get().tasks),
        archived: false,
        createdAt: now,
        updatedAt: now,
        completedAt: input.status === 'done' ? now : null,
        subtasks: (input.subtasks ?? [])
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s, i) => ({ id: createId(), taskId: id, title: s, completed: false, sortOrder: i, createdAt: now })),
        tagIds: input.tagIds ?? [],
        reminders: input.dueDate ? buildReminders(id, offsets) : [],
      };
      await commit([task]);
      return get().tasks.find((t) => t.id === id) ?? task;
    },

    updateTask: async (id, patch) => {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) return null;
      const next = applyPatch(task, patch);
      await commit([next]);
      return next;
    },

    bulkUpdate: async (ids, patch) => {
      const changed = get()
        .tasks.filter((t) => ids.includes(t.id))
        .map((t) => applyPatch(t, patch));
      await commit(changed);
    },

    deleteTasks: async (ids) => {
      const snapshots = get().tasks.filter((t) => ids.includes(t.id));
      // Tasks that depended on a deleted task are no longer blocked.
      const unblocked = get()
        .tasks.filter((t) => t.dependsOnId && ids.includes(t.dependsOnId) && !ids.includes(t.id))
        .map((t) => ({ ...t, dependsOnId: null }));
      await commit(unblocked, ids);
      return snapshots;
    },

    restoreTasks: async (snapshots) => {
      const restored = snapshots.map((t) => ({ ...t, reminders: t.reminders.map((r) => ({ ...r, notificationId: null })) }));
      await commit(restored);
    },

    toggleComplete: async (id) => {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) return { task: null, completed: false, spawned: null, blockedBy: null };

      if (task.status !== 'done' && task.dependsOnId) {
        const dependency = get().tasks.find((t) => t.id === task.dependsOnId);
        if (dependency && dependency.status !== 'done') {
          return { task, completed: false, spawned: null, blockedBy: dependency };
        }
      }

      const completing = task.status !== 'done';
      const updated = applyPatch(task, { status: completing ? 'done' : 'todo' });
      let spawned: Task | null = null;

      if (completing && task.recurrence) {
        const base = task.dueDate ?? todayKey();
        let nextDue = nextOccurrence(base, task.recurrence);
        // Never create the next occurrence in the past.
        let guard = 0;
        while (diffInDays(nextDue, todayKey()) < 0 && guard < 1000) {
          nextDue = nextOccurrence(nextDue, task.recurrence);
          guard += 1;
        }
        const shift = diffInDays(nextDue, base);
        const newId = createId();
        const now = nowIso();
        spawned = {
          ...task,
          id: newId,
          dueDate: nextDue,
          startDate: task.startDate ? addDays(task.startDate, shift) : null,
          status: 'todo',
          completedAt: null,
          createdAt: now,
          updatedAt: now,
          sortOrder: nextSortOrder(get().tasks),
          subtasks: task.subtasks.map((s) => ({ ...s, id: createId(), taskId: newId, completed: false })),
          reminders: task.reminders.map((r) => ({ ...r, id: createId(), taskId: newId, notificationId: null })),
        };
        // The completed instance stops repeating; the new one carries the rule forward.
        updated.recurrence = null;
      }

      await commit(spawned ? [updated, spawned] : [updated]);
      return { task: updated, completed: completing, spawned, blockedBy: null };
    },

    undoToggle: async (result) => {
      if (!result.task) return;
      const current = get().tasks.find((t) => t.id === result.task?.id);
      if (!current) return;
      const reverted: Task = {
        ...current,
        status: result.completed ? 'todo' : 'done',
        completedAt: result.completed ? null : nowIso(),
        recurrence: result.spawned ? result.spawned.recurrence : current.recurrence,
        updatedAt: nowIso(),
      };
      await commit([reverted], result.spawned ? [result.spawned.id] : []);
    },

    duplicateTask: async (id) => {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) return null;
      const newId = createId();
      const now = nowIso();
      const copy: Task = {
        ...task,
        id: newId,
        title: `${task.title} (copy)`.slice(0, MAX_TITLE),
        status: 'todo',
        completedAt: null,
        archived: false,
        createdAt: now,
        updatedAt: now,
        sortOrder: task.sortOrder + 0.5,
        subtasks: task.subtasks.map((s) => ({ ...s, id: createId(), taskId: newId, completed: false })),
        reminders: task.reminders.map((r) => ({ ...r, id: createId(), taskId: newId, notificationId: null })),
      };
      await commit([copy]);
      return copy;
    },

    archiveCompleted: async (ids) => {
      const targets = get().tasks.filter((t) => t.status === 'done' && !t.archived && (!ids || ids.includes(t.id)));
      await commit(targets.map((t) => ({ ...t, archived: true, updatedAt: nowIso() })));
      return targets.length;
    },

    toggleSubtask: async (taskId, subtaskId) => {
      const task = get().tasks.find((t) => t.id === taskId);
      if (!task) return;
      const subtasks = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s));
      await commit([{ ...task, subtasks, updatedAt: nowIso() }]);
    },

    addSubtask: async (taskId, title) => {
      const task = get().tasks.find((t) => t.id === taskId);
      const clean = title.trim().slice(0, MAX_TITLE);
      if (!task || !clean) return;
      const subtask: Subtask = {
        id: createId(),
        taskId,
        title: clean,
        completed: false,
        sortOrder: task.subtasks.length,
        createdAt: nowIso(),
      };
      await commit([{ ...task, subtasks: [...task.subtasks, subtask], updatedAt: nowIso() }]);
    },

    removeSubtask: async (taskId, subtaskId) => {
      const task = get().tasks.find((t) => t.id === taskId);
      if (!task) return;
      await commit([{ ...task, subtasks: task.subtasks.filter((s) => s.id !== subtaskId), updatedAt: nowIso() }]);
    },

    moveTask: async (id, direction, visibleIds) => {
      const index = visibleIds.indexOf(id);
      const swapWith = visibleIds[index + direction];
      if (index < 0 || !swapWith) return;
      const a = get().tasks.find((t) => t.id === id);
      const b = get().tasks.find((t) => t.id === swapWith);
      if (!a || !b) return;
      const orderA = a.sortOrder === b.sortOrder ? b.sortOrder + direction * 0.5 : b.sortOrder;
      await commit([
        { ...a, sortOrder: orderA, updatedAt: nowIso() },
        { ...b, sortOrder: a.sortOrder, updatedAt: nowIso() },
      ]);
    },
  };
});
