import { create } from 'zustand';

import { habitRepository } from '@/database/repositories';
import { cancelHabitNotifications, scheduleHabitNotifications } from '@/services/notificationService';
import type { DateKey, Habit, HabitCompletion, HabitFrequency } from '@/types/models';
import { nowIso } from '@/utils/date';
import { createId } from '@/utils/id';

export interface HabitInput {
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  targetPerDay: number;
  reminderTime: string | null;
}

interface HabitState {
  habits: Habit[];
  /** Check-in counts keyed by `${habitId}|${date}`. */
  completions: Record<string, number>;
  loaded: boolean;
  load: () => Promise<void>;
  createHabit: (input: HabitInput) => Promise<Habit>;
  updateHabit: (id: string, patch: Partial<HabitInput> & { archived?: boolean }) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  /** Adds one check-in, or resets to zero once the daily target was already reached. */
  checkIn: (habitId: string, date: DateKey) => Promise<number>;
  setCount: (habitId: string, date: DateKey, count: number) => Promise<void>;
  rescheduleAll: () => Promise<void>;
}

export const completionKey = (habitId: string, date: DateKey) => `${habitId}|${date}`;

function sanitizeInput(input: HabitInput): HabitInput {
  return {
    ...input,
    name: input.name.trim().slice(0, 60),
    description: input.description?.trim().slice(0, 300) ?? '',
    targetPerDay: Math.min(50, Math.max(1, Math.round(input.targetPerDay))),
    frequency:
      input.frequency.type === 'weekdays'
        ? { type: 'weekdays', days: [...new Set(input.frequency.days)].filter((d) => d >= 0 && d <= 6).sort() }
        : input.frequency.type === 'weekly'
          ? { type: 'weekly', timesPerWeek: Math.min(7, Math.max(1, Math.round(input.frequency.timesPerWeek))) }
          : { type: 'daily' },
  };
}

export const useHabitStore = create<HabitState>((set, get) => {
  async function saveWithNotifications(habit: Habit): Promise<Habit> {
    await habitRepository.save(habit);
    let ids: string[] = [];
    try {
      ids = await scheduleHabitNotifications(habit);
    } catch {
      ids = [];
    }
    const next = { ...habit, notificationIds: ids };
    if (ids.join() !== habit.notificationIds.join()) await habitRepository.save(next);
    return next;
  }

  return {
    habits: [],
    completions: {},
    loaded: false,

    load: async () => {
      const [habits, rows] = await Promise.all([habitRepository.getAll(), habitRepository.getCompletions()]);
      const completions: Record<string, number> = {};
      for (const row of rows) completions[completionKey(row.habitId, row.date)] = row.count;
      set({ habits, completions, loaded: true });
    },

    createHabit: async (input) => {
      const clean = sanitizeInput(input);
      if (!clean.name) throw new Error('Habit name is required');
      const habit: Habit = {
        id: createId(),
        name: clean.name,
        description: clean.description ?? '',
        icon: clean.icon,
        color: clean.color,
        frequency: clean.frequency,
        targetPerDay: clean.targetPerDay,
        reminderTime: clean.reminderTime,
        notificationIds: [],
        archived: false,
        sortOrder: get().habits.length,
        createdAt: nowIso(),
      };
      const saved = await saveWithNotifications(habit);
      set((s) => ({ habits: [...s.habits, saved] }));
      return saved;
    },

    updateHabit: async (id, patch) => {
      const current = get().habits.find((h) => h.id === id);
      if (!current) return;
      const merged = { ...current, ...patch };
      const clean = sanitizeInput({ ...merged, description: merged.description });
      const next: Habit = { ...merged, ...clean, name: clean.name || current.name, description: clean.description ?? '' };
      const saved = await saveWithNotifications(next);
      set((s) => ({ habits: s.habits.map((h) => (h.id === id ? saved : h)) }));
    },

    deleteHabit: async (id) => {
      const habit = get().habits.find((h) => h.id === id);
      if (habit) await cancelHabitNotifications(habit);
      await habitRepository.remove(id);
      set((s) => {
        const completions = { ...s.completions };
        for (const key of Object.keys(completions)) if (key.startsWith(`${id}|`)) delete completions[key];
        return { habits: s.habits.filter((h) => h.id !== id), completions };
      });
    },

    checkIn: async (habitId, date) => {
      const habit = get().habits.find((h) => h.id === habitId);
      if (!habit) return 0;
      const current = get().completions[completionKey(habitId, date)] ?? 0;
      const next = current >= habit.targetPerDay ? 0 : current + 1;
      await get().setCount(habitId, date, next);
      return next;
    },

    setCount: async (habitId, date, count) => {
      const key = completionKey(habitId, date);
      const previous = get().completions[key] ?? 0;
      const value = Math.max(0, Math.round(count));
      set((s) => {
        const completions = { ...s.completions };
        if (value === 0) delete completions[key];
        else completions[key] = value;
        return { completions };
      });
      const record: HabitCompletion = { id: createId(), habitId, date, count: value };
      try {
        await habitRepository.setCompletion(record);
      } catch (error) {
        set((s) => ({ completions: { ...s.completions, [key]: previous } }));
        throw error;
      }
    },

    rescheduleAll: async () => {
      const updated: Habit[] = [];
      for (const habit of get().habits) updated.push(await saveWithNotifications(habit));
      set({ habits: updated });
    },
  };
});
