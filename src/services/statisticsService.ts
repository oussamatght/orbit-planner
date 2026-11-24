import type { DateKey, FocusSession, Habit, Project, Task } from '@/types/models';
import { addDays, isoToDateKey, startOfWeek, toDateKey, fromDateKey } from '@/utils/date';
import { completionRate, type CompletionLookup } from '@/utils/habitStats';
import { isDone, isOpen, projectProgress } from '@/utils/taskFilters';

export interface DayValue {
  date: DateKey;
  value: number;
}

export function completedByDay(tasks: Task[], from: DateKey, days: number): DayValue[] {
  const counts = new Map<DateKey, number>();
  for (const t of tasks) {
    if (isDone(t) && t.completedAt) {
      const key = isoToDateKey(t.completedAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return { date, value: counts.get(date) ?? 0 };
  });
}

export function focusSecondsByDay(sessions: FocusSession[], from: DateKey, days: number): DayValue[] {
  const totals = new Map<DateKey, number>();
  for (const s of sessions) {
    if (s.mode !== 'focus') continue;
    const key = isoToDateKey(s.startedAt);
    totals.set(key, (totals.get(key) ?? 0) + s.actualSeconds);
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return { date, value: totals.get(date) ?? 0 };
  });
}

export function focusSecondsOn(sessions: FocusSession[], day: DateKey): number {
  return sessions
    .filter((s) => s.mode === 'focus' && isoToDateKey(s.startedAt) === day)
    .reduce((sum, s) => sum + s.actualSeconds, 0);
}

/** Number of tasks completed per week for the last `weeks` weeks (oldest first). */
export function completedByWeek(tasks: Task[], today: DateKey, weeks: number, weekStartsOn: number): DayValue[] {
  const thisWeek = startOfWeek(today, weekStartsOn);
  const first = addDays(thisWeek, -7 * (weeks - 1));
  const daily = completedByDay(tasks, first, weeks * 7);
  return Array.from({ length: weeks }, (_, w) => ({
    date: addDays(first, w * 7),
    value: daily.slice(w * 7, w * 7 + 7).reduce((s, d) => s + d.value, 0),
  }));
}

/** Tasks completed per calendar month for the last `months` months (oldest first). */
export function completedByMonth(tasks: Task[], today: DateKey, months: number): DayValue[] {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (isDone(t) && t.completedAt) {
      const key = isoToDateKey(t.completedAt).slice(0, 7);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const base = fromDateKey(today);
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() - (months - 1 - i), 1);
    const key = toDateKey(d);
    return { date: key, value: counts.get(key.slice(0, 7)) ?? 0 };
  });
}

/** Completed / (completed + still-open-and-due) for tasks due within the window. */
export function completionRateFor(tasks: Task[], today: DateKey, days: number): number {
  const from = addDays(today, -(days - 1));
  const relevant = tasks.filter((t) => !!t.dueDate && t.dueDate >= from && t.dueDate <= today);
  if (relevant.length === 0) return 0;
  return relevant.filter(isDone).length / relevant.length;
}

/** Consecutive days (ending today or yesterday) with at least one task completed. */
export function productiveStreak(tasks: Task[], today: DateKey): number {
  const days = new Set(tasks.filter((t) => isDone(t) && t.completedAt).map((t) => isoToDateKey(t.completedAt as string)));
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day) && streak < 3650) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export function habitConsistency(habits: Habit[], today: DateKey, count: CompletionLookup, days = 30) {
  return habits
    .filter((h) => !h.archived)
    .map((h) => ({ habit: h, rate: completionRate(h, today, days, count) }))
    .sort((a, b) => b.rate - a.rate);
}

export function projectBreakdown(projects: Project[], tasks: Task[]) {
  return projects
    .filter((p) => !p.archived)
    .map((p) => ({ project: p, ...projectProgress(tasks, p.id) }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.percent - a.percent);
}

export function openByPriority(tasks: Task[]): [number, number, number, number] {
  const result: [number, number, number, number] = [0, 0, 0, 0];
  for (const t of tasks) if (isOpen(t)) result[t.priority] += 1;
  return result;
}
