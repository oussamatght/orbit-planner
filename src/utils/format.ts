import type { TFunction } from '@/i18n';
import type { DateKey, Language, Recurrence } from '@/types/models';

import { diffInDays, formatDate, todayKey } from './date';

/** "Today", "Tomorrow", "Yesterday", weekday name within a week, otherwise a short date. */
export function relativeDate(key: DateKey, t: TFunction, language: Language, today: DateKey = todayKey()): string {
  const diff = diffInDays(key, today);
  if (diff === 0) return t('common.today');
  if (diff === 1) return t('common.tomorrow');
  if (diff === -1) return t('common.yesterday');
  if (diff > 1 && diff < 7) return formatDate(key, language, { weekday: 'long' });
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return formatDate(key, language, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

export function reminderLabel(offset: number, t: TFunction): string {
  if (offset === 0) return t('reminder.atTime');
  const map: Record<number, Parameters<TFunction>[0]> = {
    5: 'reminder.5m',
    15: 'reminder.15m',
    30: 'reminder.30m',
    60: 'reminder.1h',
    1440: 'reminder.1d',
  };
  const key = map[offset];
  const label = key ? t(key) : offset % 60 === 0 ? `${offset / 60} h` : t('common.minutes', { count: offset });
  return t('reminder.before', { label });
}

export const REMINDER_PRESETS = [0, 5, 15, 30, 60, 1440];

export function recurrenceLabel(rule: Recurrence | null, t: TFunction, language: Language): string {
  if (!rule) return t('repeat.none');
  const custom = rule.interval > 1 || (rule.frequency === 'weekly' && (rule.weekdays?.length ?? 0) > 0);
  if (!custom) return t(`repeat.${rule.frequency}`);
  let label = t('repeat.everyN', { count: rule.interval, unit: t(`repeat.unit.${rule.frequency}`) });
  if (rule.frequency === 'weekly' && rule.weekdays?.length) {
    label += ` · ${rule.weekdays.map((d) => weekdayShort(d, language)).join(', ')}`;
  }
  return label;
}

export function weekdayShort(day: number, language: Language): string {
  // 2023-01-01 was a Sunday.
  return formatDate(`2023-01-0${1 + day}`, language, { weekday: 'short' });
}

export function weekdayNarrow(day: number, language: Language): string {
  return formatDate(`2023-01-0${1 + day}`, language, { weekday: 'narrow' });
}

export function greetingKey(date = new Date()): 'greeting.morning' | 'greeting.afternoon' | 'greeting.evening' | 'greeting.night' {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'greeting.morning';
  if (h >= 12 && h < 18) return 'greeting.afternoon';
  if (h >= 18 && h < 23) return 'greeting.evening';
  return 'greeting.night';
}
