import type { Priority, Recurrence, Reminder, Subtask, Task, TaskStatus } from '@/types/models';
import { isValidRecurrence } from '@/utils/recurrence';

import { getDb, transaction, type Db } from '../database';
import type { ReminderRow, SubtaskRow, TaskRow, TaskTagRow } from '../schema';

import { bool, int, parseJson, upsertRow } from './helpers';

function rowToTask(row: TaskRow, subtasks: Subtask[], tagIds: string[], reminders: Reminder[]): Task {
  const recurrence = parseJson<Recurrence | null>(row.recurrence, null);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    notes: row.notes,
    dueDate: row.due_date,
    startDate: row.start_date,
    startTime: row.start_time,
    endTime: row.end_time,
    priority: Math.min(3, Math.max(0, row.priority)) as Priority,
    status: (['todo', 'in_progress', 'done'].includes(row.status) ? row.status : 'todo') as TaskStatus,
    projectId: row.project_id,
    categoryId: row.category_id,
    recurrence: isValidRecurrence(recurrence) ? recurrence : null,
    dependsOnId: row.depends_on_id,
    sortOrder: row.sort_order,
    archived: bool(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    subtasks,
    tagIds,
    reminders,
  };
}

function taskToRow(task: Task): TaskRow {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    notes: task.notes,
    due_date: task.dueDate,
    start_date: task.startDate,
    start_time: task.startTime,
    end_time: task.endTime,
    priority: task.priority,
    status: task.status,
    project_id: task.projectId,
    category_id: task.categoryId,
    recurrence: task.recurrence ? JSON.stringify(task.recurrence) : null,
    depends_on_id: task.dependsOnId,
    sort_order: task.sortOrder,
    archived: int(task.archived),
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    completed_at: task.completedAt,
  };
}

function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

async function writeTask(db: Db, task: Task): Promise<void> {
  // Tasks may reference a dependency that no longer exists (e.g. restored after deletion).
  let dependsOn = task.dependsOnId;
  if (dependsOn) {
    const exists = await db.getFirstAsync<{ id: string }>('SELECT id FROM tasks WHERE id = ?', dependsOn);
    if (!exists) dependsOn = null;
  }
  await upsertRow(db, 'tasks', { ...taskToRow({ ...task, dependsOnId: dependsOn }) });

  await db.runAsync('DELETE FROM subtasks WHERE task_id = ?', task.id);
  for (const s of task.subtasks) {
    await upsertRow(db, 'subtasks', {
      id: s.id,
      task_id: task.id,
      title: s.title,
      completed: int(s.completed),
      sort_order: s.sortOrder,
      created_at: s.createdAt,
    });
  }

  await db.runAsync('DELETE FROM task_tags WHERE task_id = ?', task.id);
  for (const tagId of task.tagIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO task_tags (task_id, tag_id) SELECT ?, id FROM tags WHERE id = ?',
      task.id,
      tagId,
    );
  }

  await db.runAsync('DELETE FROM reminders WHERE task_id = ?', task.id);
  for (const r of task.reminders) {
    await upsertRow(db, 'reminders', {
      id: r.id,
      task_id: task.id,
      offset_minutes: r.offsetMinutes,
      notification_id: r.notificationId,
      created_at: task.updatedAt,
    });
  }
}

export const taskRepository = {
  async getAll(): Promise<Task[]> {
    const db = await getDb();
    const [rows, subtaskRows, tagRows, reminderRows] = await Promise.all([
      db.getAllAsync<TaskRow>('SELECT * FROM tasks ORDER BY sort_order ASC, created_at ASC'),
      db.getAllAsync<SubtaskRow>('SELECT * FROM subtasks ORDER BY sort_order ASC, created_at ASC'),
      db.getAllAsync<TaskTagRow>('SELECT * FROM task_tags'),
      db.getAllAsync<ReminderRow>('SELECT * FROM reminders ORDER BY offset_minutes DESC'),
    ]);
    const subtasks = groupBy(subtaskRows, (r) => r.task_id);
    const tags = groupBy(tagRows, (r) => r.task_id);
    const reminders = groupBy(reminderRows, (r) => r.task_id);
    return rows.map((row) =>
      rowToTask(
        row,
        (subtasks.get(row.id) ?? []).map((s) => ({
          id: s.id,
          taskId: s.task_id,
          title: s.title,
          completed: bool(s.completed),
          sortOrder: s.sort_order,
          createdAt: s.created_at,
        })),
        (tags.get(row.id) ?? []).map((t) => t.tag_id),
        (reminders.get(row.id) ?? []).map((r) => ({
          id: r.id,
          taskId: r.task_id,
          offsetMinutes: r.offset_minutes,
          notificationId: r.notification_id,
        })),
      ),
    );
  },

  /** Inserts or fully replaces tasks (including subtasks, tags and reminders) atomically. */
  async save(tasks: Task | Task[]): Promise<void> {
    const list = Array.isArray(tasks) ? tasks : [tasks];
    if (list.length === 0) return;
    await transaction(async (db) => {
      for (const task of list) await writeTask(db, task);
    });
  },

  async remove(ids: string | string[]): Promise<void> {
    const list = Array.isArray(ids) ? ids : [ids];
    if (list.length === 0) return;
    await transaction(async (db) => {
      for (const id of list) await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
    });
  },

  async setReminderNotificationId(reminderId: string, notificationId: string | null): Promise<void> {
    const db = await getDb();
    await db.runAsync('UPDATE reminders SET notification_id = ? WHERE id = ?', notificationId, reminderId);
  },
};
