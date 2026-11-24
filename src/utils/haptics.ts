import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/store/settingsStore';

const enabled = () => useSettingsStore.getState().settings.hapticsEnabled;

/** Haptic helpers that respect the user's preference and never throw (e.g. on devices without a motor). */
export const haptics = {
  light: () => {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  medium: () => {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  },
  selection: () => {
    if (enabled()) Haptics.selectionAsync().catch(() => undefined);
  },
  success: () => {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning: () => {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
  error: () => {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
  },
};
