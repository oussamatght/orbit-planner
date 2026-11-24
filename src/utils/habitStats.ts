import type { DateKey, Habit } from '@/types/models';

import { addDays, diffInDays, isoToDateKey, startOfWeek, weekday } from './date';

export type CompletionLookup = (habitId: string, date: DateKey) => number;

/** Whether a habit is expected on a given day. Weekly-count habits are "available" every day. */
export function isScheduledOn(habit: Habit, date: DateKey): boolean {
  if (habit.frequency.type === 'weekdays') return habit.frequency.days.includes(weekday(date));
  return true;
}

export function isCompleteOn(habit: Habit, date: DateKey, count: CompletionLookup): boolean {
  return count(habit.id, date) >= habit.targetPerDay;
}

function weekCompletions(habit: Habit, weekStart: DateKey, count: CompletionLookup): number {
  let n = 0;
  for (let i = 0; i < 7; i += 1) if (isCompleteOn(habit, addDays(weekStart, i), count)) n += 1;
  return n;
}

export interface StreakInfo {
  current: number;
  best: number;
  unit: 'days' | 'weeks';
}

/**
 * Daily/weekday habits: consecutive scheduled days completed (unscheduled days are skipped,
 * and today does not break the streak until it is over).
 * Weekly-count habits: consecutive weeks meeting the target (the current week counts once met).
 */
export function streaks(habit: Habit, today: DateKey, count: CompletionLookup, weekStartsOn: number): StreakInfo {
  const created = isoToDateKey(habit.createdAt);
  if (habit.frequency.type === 'weekly') {
    const target = habit.frequency.timesPerWeek;
    let current = 0;
    let best = 0;
    let run = 0;
    const thisWeek = startOfWeek(today, weekStartsOn);
    const firstWeek = startOfWeek(created, weekStartsOn);
    const totalWeeks = Math.max(0, Math.floor(diffInDays(thisWeek, firstWeek) / 7));
    for (let w = 0; w <= totalWeeks; w += 1) {
      const start = addDays(firstWeek, w * 7);
      if (weekCompletions(habit, start, count) >= target) {
        run += 1;
        best = Math.max(best, run);
      } else if (start !== thisWeek) {
        run = 0;
      }
    }
    current = run;
    return { current, best, unit: 'weeks' };
  }

  // Walk backwards for the current streak.
  let current = 0;
  let day = today;
  if (!isCompleteOn(habit, today, count)) day = addDays(today, -1);
  for (let i = 0; i < 3660 && day >= created; i += 1) {
    if (isScheduledOn(habit, day)) {
      if (isCompleteOn(habit, day, count)) current += 1;
      else break;
    }
    day = addDays(day, -1);
  }

  // Walk forwards for the best streak.
  let best = 0;
  let run = 0;
  const span = Math.min(3660, diffInDays(today, created));
  for (let i = 0; i <= span; i += 1) {
    const d = addDays(created, i);
    if (!isScheduledOn(habit, d)) continue;
    if (isCompleteOn(habit, d, count)) {
      run += 1;
      best = Math.max(best, run);
    } else if (d !== today) {
      run = 0;
    }
  }
  return { current, best: Math.max(best, current), unit: 'days' };
}

/** Share of scheduled days (or weekly targets) met over the last `days` days, from creation. */
export function completionRate(habit: Habit, today: DateKey, days: number, count: CompletionLookup): number {
  const created = isoToDateKey(habit.createdAt);
  let scheduled = 0;
  let done = 0;
  for (let i = 0; i < days; i += 1) {
    const d = addDays(today, -i);
    if (d < created) break;
    if (habit.frequency.type === 'weekly') {
      scheduled += habit.frequency.timesPerWeek / 7;
      if (isCompleteOn(habit, d, count)) done += 1;
      continue;
    }
    if (!isScheduledOn(habit, d)) continue;
    scheduled += 1;
    if (isCompleteOn(habit, d, count)) done += 1;
  }
  if (scheduled === 0) return 0;
  return Math.min(1, done / scheduled);
}

export function totalCheckIns(habit: Habit, completions: Record<string, number>): number {
  let total = 0;
  for (const [key, value] of Object.entries(completions)) {
    if (key.startsWith(`${habit.id}|`) && value >= habit.targetPerDay) total += 1;
  }
  return total;
}

export function weekProgress(habit: Habit, today: DateKey, count: CompletionLookup, weekStartsOn: number) {
  const start = startOfWeek(today, weekStartsOn);
  const done = weekCompletions(habit, start, count);
  const target =
    habit.frequency.type === 'weekly'
      ? habit.frequency.timesPerWeek
      : habit.frequency.type === 'weekdays'
        ? habit.frequency.days.length
        : 7;
  return { done, target };
}
