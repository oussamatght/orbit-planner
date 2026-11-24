import type { DateKey, Tag, Task } from '@/types/models';

import { addDays, diffInDays, timeToMinutes } from './date';

export type TaskFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed' | 'high' | 'unscheduled' | 'archived';
export const TASK_FILTERS: TaskFilter[] = ['all', 'today', 'upcoming', 'overdue', 'high', 'unscheduled', 'completed', 'archived'];

export type TaskSort = 'manual' | 'dueDate' | 'priority' | 'created' | 'alpha';
export const TASK_SORTS: TaskSort[] = ['manual', 'dueDate', 'priority', 'created', 'alpha'];

export const isDone = (t: Task) => t.status === 'done';
export const isActive = (t: Task) => !t.archived;
export const isOpen = (t: Task) => !t.archived && t.status !== 'done';

export function isOverdue(t: Task, today: DateKey): boolean {
  return isOpen(t) && !!t.dueDate && t.dueDate < today;
}

export function isDueOn(t: Task, day: DateKey): boolean {
  return !t.archived && t.dueDate === day;
}

/** Inbox = open tasks with no date and no project. */
export function isInbox(t: Task): boolean {
  return isOpen(t) && !t.dueDate && !t.projectId;
}

export function filterTasks(tasks: Task[], filter: TaskFilter, today: DateKey): Task[] {
  switch (filter) {
    case 'all':
      return tasks.filter(isActive);
    case 'today':
      return tasks.filter((t) => isActive(t) && t.dueDate === today);
    case 'upcoming':
      return tasks.filter((t) => isOpen(t) && !!t.dueDate && t.dueDate > today);
    case 'overdue':
      return tasks.filter((t) => isOverdue(t, today));
    case 'completed':
      return tasks.filter((t) => isActive(t) && isDone(t));
    case 'high':
      return tasks.filter((t) => isOpen(t) && t.priority >= 2);
    case 'unscheduled':
      return tasks.filter((t) => isOpen(t) && !t.dueDate);
    case 'archived':
      return tasks.filter((t) => t.archived);
    default:
      return tasks;
  }
}

const dueValue = (t: Task) => (t.dueDate ? `${t.dueDate} ${t.startTime ?? '99:99'}` : '9999-99-99');

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const list = [...tasks];
  const doneLast = (a: Task, b: Task) => Number(isDone(a)) - Number(isDone(b));
  switch (sort) {
    case 'dueDate':
      return list.sort((a, b) => doneLast(a, b) || dueValue(a).localeCompare(dueValue(b)) || b.priority - a.priority);
    case 'priority':
      return list.sort((a, b) => doneLast(a, b) || b.priority - a.priority || dueValue(a).localeCompare(dueValue(b)));
    case 'created':
      return list.sort((a, b) => doneLast(a, b) || b.createdAt.localeCompare(a.createdAt));
    case 'alpha':
      return list.sort((a, b) => doneLast(a, b) || a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    case 'manual':
    default:
      return list.sort((a, b) => doneLast(a, b) || a.sortOrder - b.sortOrder);
  }
}

/** Orders a day's tasks: timed tasks by start time, then untimed by priority. */
export function sortForDay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const doneDiff = Number(isDone(a)) - Number(isDone(b));
    if (doneDiff) return doneDiff;
    if (a.startTime && b.startTime) return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return b.priority - a.priority || a.sortOrder - b.sortOrder;
  });
}

export function searchTasks(tasks: Task[], query: string, tags: Tag[]): Task[] {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;
  const tagNames = new Map(tags.map((t) => [t.id, t.name.toLowerCase()]));
  return tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.notes.toLowerCase().includes(q) ||
      t.subtasks.some((s) => s.title.toLowerCase().includes(q)) ||
      t.tagIds.some((id) => tagNames.get(id)?.includes(q.replace(/^#/, ''))),
  );
}

export function upcomingTasks(tasks: Task[], today: DateKey, days: number): Task[] {
  const end = addDays(today, days);
  return sortTasks(
    tasks.filter((t) => isOpen(t) && !!t.dueDate && t.dueDate > today && t.dueDate <= end),
    'dueDate',
  );
}

export function overdueDays(t: Task, today: DateKey): number {
  return t.dueDate ? diffInDays(today, t.dueDate) : 0;
}

export function projectProgress(tasks: Task[], projectId: string): { total: number; done: number; percent: number } {
  const list = tasks.filter((t) => t.projectId === projectId && !t.archived);
  const done = list.filter(isDone).length;
  return { total: list.length, done, percent: list.length ? Math.round((done / list.length) * 100) : 0 };
}
