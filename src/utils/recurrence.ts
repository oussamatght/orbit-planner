import type { DateKey, Recurrence } from '@/types/models';

import { addDays, addMonths, weekday } from './date';

/**
 * Returns the next occurrence strictly after `from` for a recurrence rule.
 * Weekly rules with explicit weekdays pick the next matching weekday, honouring the interval
 * by skipping (interval - 1) weeks once the week's weekdays are exhausted.
 */
export function nextOccurrence(from: DateKey, rule: Recurrence): DateKey {
  const interval = Math.max(1, Math.floor(rule.interval || 1));
  switch (rule.frequency) {
    case 'daily':
      return addDays(from, interval);
    case 'weekly': {
      const days = [...new Set(rule.weekdays ?? [])].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
      if (days.length === 0) return addDays(from, 7 * interval);
      const current = weekday(from);
      const laterThisWeek = days.find((d) => d > current);
      if (laterThisWeek !== undefined) return addDays(from, laterThisWeek - current);
      // Jump to the first selected weekday of the next eligible week.
      const daysToNextWeekStart = 7 - current;
      return addDays(from, daysToNextWeekStart + 7 * (interval - 1) + days[0]);
    }
    case 'monthly':
      return addMonths(from, interval);
    case 'yearly':
      return addMonths(from, 12 * interval);
    default:
      return addDays(from, interval);
  }
}

export function isValidRecurrence(value: unknown): value is Recurrence {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(String(v.frequency))) return false;
  if (typeof v.interval !== 'number' || v.interval < 1 || v.interval > 365) return false;
  if (v.weekdays !== undefined) {
    if (!Array.isArray(v.weekdays)) return false;
    if (!v.weekdays.every((d) => typeof d === 'number' && d >= 0 && d <= 6)) return false;
  }
  return true;
}
