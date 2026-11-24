import type { Habit, HabitCompletion, HabitFrequency } from '@/types/models';

import { getDb } from '../database';
import type { HabitCompletionRow, HabitRow } from '../schema';

import { bool, int, parseJson, upsertRow } from './helpers';

function parseFrequency(text: string): HabitFrequency {
  const value = parseJson<HabitFrequency | null>(text, null);
  if (value?.type === 'weekdays' && Array.isArray(value.days)) return value;
  if (value?.type === 'weekly' && typeof value.timesPerWeek === 'number') return value;
  return { type: 'daily' };
}

const toHabit = (r: HabitRow): Habit => ({
  id: r.id,
  name: r.name,
  description: r.description,
  icon: r.icon,
  color: r.color,
  frequency: parseFrequency(r.frequency),
  targetPerDay: Math.max(1, r.target_per_day),
  reminderTime: r.reminder_time,
  notificationIds: parseJson<string[]>(r.notification_ids, []),
  archived: bool(r.archived),
  sortOrder: r.sort_order,
  createdAt: r.created_at,
});

export const habitRepository = {
  async getAll(): Promise<Habit[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<HabitRow>('SELECT * FROM habits ORDER BY sort_order ASC, created_at ASC');
    return rows.map(toHabit);
  },
  async getCompletions(): Promise<HabitCompletion[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<HabitCompletionRow>('SELECT * FROM habit_completions');
    return rows.map((r) => ({ id: r.id, habitId: r.habit_id, date: r.date, count: r.count }));
  },
  async save(h: Habit): Promise<void> {
    const db = await getDb();
    await upsertRow(db, 'habits', {
      id: h.id,
      name: h.name,
      description: h.description,
      icon: h.icon,
      color: h.color,
      frequency: JSON.stringify(h.frequency),
      target_per_day: h.targetPerDay,
      reminder_time: h.reminderTime,
      notification_ids: JSON.stringify(h.notificationIds),
      archived: int(h.archived),
      sort_order: h.sortOrder,
      created_at: h.createdAt,
    });
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM habits WHERE id = ?', id);
  },
  /** Sets the check-in count for a day; a count of 0 removes the record. */
  async setCompletion(c: HabitCompletion): Promise<void> {
    const db = await getDb();
    if (c.count <= 0) {
      await db.runAsync('DELETE FROM habit_completions WHERE habit_id = ? AND date = ?', c.habitId, c.date);
      return;
    }
    await db.runAsync(
      `INSERT INTO habit_completions (id, habit_id, date, count) VALUES (?, ?, ?, ?)
       ON CONFLICT(habit_id, date) DO UPDATE SET count = excluded.count`,
      c.id,
      c.habitId,
      c.date,
      c.count,
    );
  },
};
