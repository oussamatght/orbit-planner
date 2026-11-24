import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import type { FocusMode, Habit, Reminder, Task } from '@/types/models';
import { combineDateTime, isValidTime } from '@/utils/date';

const CHANNELS = {
  reminders: 'reminders',
  habits: 'habits',
  focus: 'focus',
} as const;

const FOCUS_ID = 'focus-timer';

const settings = () => useSettingsStore.getState().settings;

let configured = false;

/** Installs the foreground handler and Android channels. Safe to call more than once. */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    // Channels must exist before Android 13+ will show the permission prompt.
    await Promise.all([
      Notifications.setNotificationChannelAsync(CHANNELS.reminders, {
        name: 'Task reminders',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 120, 200],
        lightColor: '#5B5BF6',
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.habits, {
        name: 'Habit reminders',
        importance: AndroidImportance.DEFAULT,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.focus, {
        name: 'Focus timer',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 150, 300],
      }),
    ]).catch(() => undefined);
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermissionState(): Promise<PermissionState> {
  try {
    const status = await Notifications.getPermissionsAsync();
    if (status.granted) return 'granted';
    if (Platform.OS === 'ios' && status.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'granted';
    return status.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Asks for permission only when the user does something that needs it
 * (adds a reminder, enables habit reminders, starts a timer) — never on cold start.
 */
export async function ensurePermission(): Promise<boolean> {
  if (!settings().notificationsEnabled) return false;
  await configureNotifications();
  const state = await getPermissionState();
  if (state === 'granted') return true;
  if (state === 'denied') return false;
  try {
    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return result.granted;
  } catch {
    return false;
  }
}

async function cancel(identifier: string | null | undefined): Promise<void> {
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}

const reminderIdentifier = (reminderId: string) => `task-${reminderId}`;
const deadlineIdentifier = (taskId: string) => `deadline-${taskId}`;

function reminderLabel(offset: number): string {
  if (offset === 0) return t('reminder.atTime');
  if (offset % 1440 === 0) return t('common.days', { count: offset / 1440 });
  if (offset % 60 === 0) return `${offset / 60} h`;
  return t('common.minutes', { count: offset });
}

export async function cancelTaskNotifications(task: Pick<Task, 'id' | 'reminders'>): Promise<void> {
  await Promise.all([
    ...task.reminders.map((r) => cancel(r.notificationId ?? reminderIdentifier(r.id))),
    cancel(deadlineIdentifier(task.id)),
  ]);
}

/**
 * Cancels and re-creates a task's reminders. Returns the reminders with their new notification ids
 * (null when nothing was scheduled, e.g. time already passed, task done, or permission missing).
 */
export async function scheduleTaskNotifications(task: Task): Promise<Reminder[]> {
  await cancelTaskNotifications(task);
  const s = settings();
  const cleared = task.reminders.map((r) => ({ ...r, notificationId: null }));
  if (!s.notificationsEnabled || task.status === 'done' || task.archived || !task.dueDate) return cleared;

  const wantsReminders = s.taskRemindersEnabled && task.reminders.length > 0;
  const wantsDeadline = s.deadlineAlertsEnabled && task.reminders.length === 0;
  if (!wantsReminders && !wantsDeadline) return cleared;

  const granted = await ensurePermission();
  if (!granted) return cleared;

  const now = Date.now();
  const moment = combineDateTime(task.dueDate, task.startTime, s.defaultReminderTime);
  const result: Reminder[] = [];

  if (wantsReminders) {
    for (const reminder of task.reminders) {
      const fireAt = moment.getTime() - reminder.offsetMinutes * 60_000;
      if (fireAt <= now + 5_000) {
        result.push({ ...reminder, notificationId: null });
        continue;
      }
      try {
        const id = await Notifications.scheduleNotificationAsync({
          identifier: reminderIdentifier(reminder.id),
          content: {
            title: task.title,
            body:
              reminder.offsetMinutes === 0
                ? task.description || t('reminder.atTime')
                : t('reminder.before', { label: reminderLabel(reminder.offsetMinutes) }),
            data: { taskId: task.id, kind: 'task' },
            sound: true,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: CHANNELS.reminders },
        });
        result.push({ ...reminder, notificationId: id });
      } catch {
        result.push({ ...reminder, notificationId: null });
      }
    }
  } else {
    result.push(...cleared);
  }

  if (wantsDeadline) {
    const morning = combineDateTime(task.dueDate, s.defaultReminderTime);
    if (morning.getTime() > now + 5_000) {
      await Notifications.scheduleNotificationAsync({
        identifier: deadlineIdentifier(task.id),
        content: {
          title: t('task.dueDate'),
          body: task.title,
          data: { taskId: task.id, kind: 'deadline' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: morning.getTime(),
          channelId: CHANNELS.reminders,
        },
      }).catch(() => undefined);
    }
  }
  return result;
}

const habitIdentifier = (habitId: string, n: number) => `habit-${habitId}-${n}`;

export async function cancelHabitNotifications(habit: Pick<Habit, 'id' | 'notificationIds'>): Promise<void> {
  const ids = new Set(habit.notificationIds);
  for (let i = 0; i < 7; i += 1) ids.add(habitIdentifier(habit.id, i));
  await Promise.all([...ids].map((id) => cancel(id)));
}

/** Schedules repeating habit reminders. Returns the notification ids that were created. */
export async function scheduleHabitNotifications(habit: Habit): Promise<string[]> {
  await cancelHabitNotifications(habit);
  const s = settings();
  if (!s.notificationsEnabled || !s.habitRemindersEnabled || habit.archived || !isValidTime(habit.reminderTime)) return [];
  const granted = await ensurePermission();
  if (!granted) return [];
  const [hour, minute] = habit.reminderTime.split(':').map(Number);
  const content = { title: habit.name, body: habit.description || t('habits.reminder'), data: { habitId: habit.id, kind: 'habit' } };
  const ids: string[] = [];
  try {
    if (habit.frequency.type === 'weekdays' && habit.frequency.days.length > 0 && habit.frequency.days.length < 7) {
      for (const [i, day] of habit.frequency.days.entries()) {
        ids.push(
          await Notifications.scheduleNotificationAsync({
            identifier: habitIdentifier(habit.id, i),
            content,
            // expo-notifications weekdays are 1 (Sunday) – 7 (Saturday).
            trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour, minute, channelId: CHANNELS.habits },
          }),
        );
      }
    } else {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          identifier: habitIdentifier(habit.id, 0),
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNELS.habits },
        }),
      );
    }
  } catch {
    // Scheduling can fail when the OS limit is reached; the habit itself is still saved.
  }
  return ids;
}

export async function scheduleFocusEnd(endsAt: number, mode: FocusMode): Promise<void> {
  await cancel(FOCUS_ID);
  const s = settings();
  if (!s.notificationsEnabled || !s.focusNotificationsEnabled || endsAt <= Date.now() + 1_000) return;
  const granted = await ensurePermission();
  if (!granted) return;
  const isFocus = mode === 'focus';
  await Notifications.scheduleNotificationAsync({
    identifier: FOCUS_ID,
    content: {
      title: isFocus ? t('focus.sessionDone') : t('focus.breakDone'),
      body: isFocus ? t('focus.sessionDoneBody') : t('focus.breakDoneBody'),
      data: { kind: 'focus' },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: endsAt, channelId: CHANNELS.focus },
  }).catch(() => undefined);
}

export async function cancelFocusEnd(): Promise<void> {
  await cancel(FOCUS_ID);
}

/** Drops every scheduled notification (used before restoring a backup or clearing data). */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}
