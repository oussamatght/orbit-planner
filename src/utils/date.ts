import type { DateKey, TimeOfDay } from '@/types/models';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a `YYYY-MM-DD` key as a local date at midnight. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = fromDateKey(value);
  return toDateKey(d) === value;
}

export function isValidTime(value: unknown): value is TimeOfDay {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Adds months, clamping the day to the target month's length (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(key: DateKey, months: number): DateKey {
  const d = fromDateKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = daysInMonth(d.getFullYear(), d.getMonth());
  d.setDate(Math.min(day, last));
  return toDateKey(d);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function diffInDays(a: DateKey, b: DateKey): number {
  const ms = fromDateKey(a).getTime() - fromDateKey(b).getTime();
  return Math.round(ms / 86_400_000);
}

export function weekday(key: DateKey): number {
  return fromDateKey(key).getDay();
}

export function startOfWeek(key: DateKey, weekStartsOn: number): DateKey {
  const offset = (weekday(key) - weekStartsOn + 7) % 7;
  return addDays(key, -offset);
}

export function weekDays(key: DateKey, weekStartsOn: number): DateKey[] {
  const start = startOfWeek(key, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

/** 6x7 grid of date keys covering the month containing `key`. */
export function monthGrid(key: DateKey, weekStartsOn: number): DateKey[] {
  const first = startOfWeek(startOfMonth(key), weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function isSameMonth(a: DateKey, b: DateKey): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function timeToMinutes(time: TimeOfDay): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): TimeOfDay {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/** Combines a date key and optional time into a local Date. */
export function combineDateTime(key: DateKey, time: TimeOfDay | null, fallback: TimeOfDay = '09:00'): Date {
  const d = fromDateKey(key);
  const [h, m] = (time ?? fallback).split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export function locale(language: string): string {
  // Arabic month/day names with Western digits, matching the numbers shown elsewhere in the UI.
  if (language === 'ar') return 'ar-u-nu-latn';
  return language === 'fr' ? 'fr-FR' : 'en-US';
}

export function formatDate(key: DateKey, language: string, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(locale(language), options).format(fromDateKey(key));
  } catch {
    return key;
  }
}

export function formatTime(time: TimeOfDay, language: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  try {
    return new Intl.DateTimeFormat(locale(language), { hour: 'numeric', minute: '2-digit' }).format(d);
  } catch {
    return time;
  }
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Local date key of an ISO timestamp. */
export function isoToDateKey(iso: string): DateKey {
  return toDateKey(new Date(iso));
}
