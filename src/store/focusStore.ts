import { create } from 'zustand';

import { focusRepository, preferenceRepository } from '@/database/repositories';
import { cancelFocusEnd, scheduleFocusEnd } from '@/services/notificationService';
import type { FocusMode, FocusSession } from '@/types/models';
import { createId } from '@/utils/id';

import { useSettingsStore } from './settingsStore';

export type TimerStatus = 'idle' | 'running' | 'paused';

interface TimerSnapshot {
  mode: FocusMode;
  status: TimerStatus;
  durationSeconds: number;
  /** Epoch ms when a running timer ends. */
  endsAt: number | null;
  /** Seconds left while paused or idle. */
  remainingSeconds: number;
  startedAt: string | null;
  taskId: string | null;
  completedFocusCount: number;
}

interface FocusState extends TimerSnapshot {
  sessions: FocusSession[];
  loaded: boolean;
  load: () => Promise<void>;
  setMode: (mode: FocusMode) => void;
  setTask: (taskId: string | null) => void;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  reset: () => Promise<void>;
  skip: () => Promise<void>;
  /** Checks whether a running timer has elapsed; records the session and advances the cycle. */
  tick: () => Promise<FocusMode | null>;
  remaining: () => number;
  deleteSession: (id: string) => Promise<void>;
  syncDurations: () => void;
}

const TIMER_KEY = 'focusTimer';

export function durationFor(mode: FocusMode): number {
  const s = useSettingsStore.getState().settings;
  const minutes = mode === 'focus' ? s.focusMinutes : mode === 'short_break' ? s.shortBreakMinutes : s.longBreakMinutes;
  return minutes * 60;
}

function snapshot(state: FocusState): TimerSnapshot {
  const { mode, status, durationSeconds, endsAt, remainingSeconds, startedAt, taskId, completedFocusCount } = state;
  return { mode, status, durationSeconds, endsAt, remainingSeconds, startedAt, taskId, completedFocusCount };
}

function isSnapshot(value: unknown): value is TimerSnapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    ['focus', 'short_break', 'long_break'].includes(String(v.mode)) &&
    ['idle', 'running', 'paused'].includes(String(v.status)) &&
    typeof v.durationSeconds === 'number' &&
    typeof v.remainingSeconds === 'number'
  );
}

export const useFocusStore = create<FocusState>((set, get) => {
  const saveTimer = () => preferenceRepository.set(TIMER_KEY, snapshot(get())).catch(() => undefined);

  async function record(completed: boolean): Promise<void> {
    const s = get();
    if (!s.startedAt) return;
    const elapsed =
      s.status === 'running' && s.endsAt
        ? s.durationSeconds - Math.max(0, (s.endsAt - Date.now()) / 1000)
        : s.durationSeconds - s.remainingSeconds;
    const actual = Math.round(completed ? s.durationSeconds : Math.max(0, elapsed));
    if (actual < 60 && !completed) return; // ignore accidental starts
    const session: FocusSession = {
      id: createId(),
      taskId: s.taskId,
      mode: s.mode,
      plannedSeconds: s.durationSeconds,
      actualSeconds: actual,
      startedAt: s.startedAt,
      endedAt: new Date().toISOString(),
      completed,
    };
    await focusRepository.insert(session);
    set((state) => ({ sessions: [session, ...state.sessions] }));
  }

  function idleFor(mode: FocusMode): Partial<FocusState> {
    const duration = durationFor(mode);
    return { mode, status: 'idle', durationSeconds: duration, remainingSeconds: duration, endsAt: null, startedAt: null };
  }

  return {
    mode: 'focus',
    status: 'idle',
    durationSeconds: 25 * 60,
    endsAt: null,
    remainingSeconds: 25 * 60,
    startedAt: null,
    taskId: null,
    completedFocusCount: 0,
    sessions: [],
    loaded: false,

    load: async () => {
      const [sessions, prefs] = await Promise.all([focusRepository.getAll(), preferenceRepository.getAll()]);
      const saved = prefs[TIMER_KEY];
      if (isSnapshot(saved)) set({ ...saved, sessions, loaded: true });
      else set({ ...idleFor('focus'), sessions, loaded: true });
      await get().tick();
    },

    syncDurations: () => {
      if (get().status === 'idle') set(idleFor(get().mode));
    },

    setMode: (mode) => {
      if (get().status === 'running') return;
      set(idleFor(mode));
      void saveTimer();
    },

    setTask: (taskId) => {
      set({ taskId });
      void saveTimer();
    },

    start: async () => {
      const s = get();
      if (s.status === 'running') return;
      const remaining = s.status === 'paused' ? s.remainingSeconds : s.durationSeconds;
      const endsAt = Date.now() + remaining * 1000;
      set({ status: 'running', endsAt, startedAt: s.startedAt ?? new Date().toISOString() });
      void saveTimer();
      await scheduleFocusEnd(endsAt, s.mode);
    },

    pause: async () => {
      const s = get();
      if (s.status !== 'running' || !s.endsAt) return;
      set({ status: 'paused', remainingSeconds: Math.max(0, (s.endsAt - Date.now()) / 1000), endsAt: null });
      void saveTimer();
      await cancelFocusEnd();
    },

    reset: async () => {
      await record(false);
      await cancelFocusEnd();
      set(idleFor(get().mode));
      void saveTimer();
    },

    skip: async () => {
      const s = get();
      await record(false);
      await cancelFocusEnd();
      const next: FocusMode = s.mode === 'focus' ? 'short_break' : 'focus';
      set(idleFor(next));
      void saveTimer();
    },

    tick: async () => {
      const s = get();
      if (s.status !== 'running' || !s.endsAt || s.endsAt > Date.now()) return null;
      const finished = s.mode;
      await record(true);
      const settings = useSettingsStore.getState().settings;
      let count = s.completedFocusCount;
      let next: FocusMode = 'focus';
      if (finished === 'focus') {
        count += 1;
        next = count % settings.sessionsBeforeLongBreak === 0 ? 'long_break' : 'short_break';
      }
      set({ ...idleFor(next), completedFocusCount: count });
      void saveTimer();
      return finished;
    },

    remaining: () => {
      const s = get();
      if (s.status === 'running' && s.endsAt) return Math.max(0, (s.endsAt - Date.now()) / 1000);
      return s.remainingSeconds;
    },

    deleteSession: async (id) => {
      await focusRepository.remove(id);
      set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
    },
  };
});
