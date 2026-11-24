import { getLocales } from 'expo-localization';
import { create } from 'zustand';

import { preferenceRepository } from '@/database/repositories';
import type { AppSettings, Language } from '@/types/models';
import { isValidTime } from '@/utils/date';

export const DEFAULT_SETTINGS: AppSettings = {
  onboarded: false,
  userName: '',
  theme: 'system',
  language: 'en',
  weekStartsOn: 1,
  notificationsEnabled: true,
  taskRemindersEnabled: true,
  habitRemindersEnabled: true,
  focusNotificationsEnabled: true,
  deadlineAlertsEnabled: false,
  defaultPriority: 1,
  defaultReminder: null,
  defaultReminderTime: '09:00',
  hapticsEnabled: true,
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  dailyFocusGoalMinutes: 120,
};

const SETTINGS_KEY = 'settings';

function deviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'ar' || code === 'fr' ? code : 'en';
  } catch {
    return 'en';
  }
}

const clampInt = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

/** Merges stored values over defaults, discarding anything malformed. */
export function sanitizeSettings(raw: unknown): AppSettings {
  const d = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== 'object') return { ...d };
  const r = raw as Partial<Record<keyof AppSettings, unknown>>;
  const bool = (v: unknown, f: boolean) => (typeof v === 'boolean' ? v : f);
  return {
    onboarded: bool(r.onboarded, d.onboarded),
    userName: typeof r.userName === 'string' ? r.userName.slice(0, 40) : d.userName,
    theme: r.theme === 'light' || r.theme === 'dark' || r.theme === 'system' ? r.theme : d.theme,
    language: r.language === 'fr' || r.language === 'en' || r.language === 'ar' ? r.language : d.language,
    weekStartsOn: r.weekStartsOn === 0 || r.weekStartsOn === 1 || r.weekStartsOn === 6 ? r.weekStartsOn : d.weekStartsOn,
    notificationsEnabled: bool(r.notificationsEnabled, d.notificationsEnabled),
    taskRemindersEnabled: bool(r.taskRemindersEnabled, d.taskRemindersEnabled),
    habitRemindersEnabled: bool(r.habitRemindersEnabled, d.habitRemindersEnabled),
    focusNotificationsEnabled: bool(r.focusNotificationsEnabled, d.focusNotificationsEnabled),
    deadlineAlertsEnabled: bool(r.deadlineAlertsEnabled, d.deadlineAlertsEnabled),
    defaultPriority: clampInt(r.defaultPriority, 0, 3, d.defaultPriority) as AppSettings['defaultPriority'],
    defaultReminder:
      r.defaultReminder === null ? null : typeof r.defaultReminder === 'number' ? clampInt(r.defaultReminder, 0, 10080, 0) : d.defaultReminder,
    defaultReminderTime: isValidTime(r.defaultReminderTime) ? r.defaultReminderTime : d.defaultReminderTime,
    hapticsEnabled: bool(r.hapticsEnabled, d.hapticsEnabled),
    focusMinutes: clampInt(r.focusMinutes, 1, 180, d.focusMinutes),
    shortBreakMinutes: clampInt(r.shortBreakMinutes, 1, 60, d.shortBreakMinutes),
    longBreakMinutes: clampInt(r.longBreakMinutes, 1, 90, d.longBreakMinutes),
    sessionsBeforeLongBreak: clampInt(r.sessionsBeforeLongBreak, 2, 10, d.sessionsBeforeLongBreak),
    dailyFocusGoalMinutes: clampInt(r.dailyFocusGoalMinutes, 10, 720, d.dailyFocusGoalMinutes),
  };
}

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const all = await preferenceRepository.getAll();
    const stored = all[SETTINGS_KEY];
    // First launch: follow the device language when we support it.
    const settings = stored ? sanitizeSettings(stored) : { ...sanitizeSettings(null), language: deviceLanguage() };
    set({ settings, loaded: true });
  },
  update: async (patch) => {
    const previous = get().settings;
    const next = sanitizeSettings({ ...previous, ...patch });
    set({ settings: next });
    try {
      await preferenceRepository.set(SETTINGS_KEY, next);
    } catch (error) {
      set({ settings: previous });
      throw error;
    }
  },
}));
