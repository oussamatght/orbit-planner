import { reloadAppAsync } from 'expo';
import { I18nManager, Platform } from 'react-native';

import { isRtlLanguage, t } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import type { Language } from '@/types/models';
import { haptics } from '@/utils/haptics';

import { rescheduleAllNotifications } from './bootstrap';

/**
 * Makes the native layout direction match the app language (not the device language).
 * Returns true when the direction had to change; React Native applies it on the next start.
 */
export function syncLayoutDirection(language: Language): boolean {
  if (Platform.OS === 'web') return false;
  const rtl = isRtlLanguage(language);
  I18nManager.allowRTL(rtl);
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.forceRTL(rtl);
  return true;
}

/**
 * Changes the UI language. Switching to or from Arabic also flips the layout direction and the
 * font family, which only take effect after a restart, so the app reloads itself.
 */
export async function changeLanguage(language: Language): Promise<void> {
  const previous = useSettingsStore.getState().settings.language;
  if (previous === language) return;
  try {
    await useSettingsStore.getState().update({ language });
  } catch {
    toast.error(t('error.saveFailed'));
    return;
  }
  haptics.selection();
  // Notification texts are generated in the current language.
  await rescheduleAllNotifications().catch(() => undefined);

  const needsRestart = isRtlLanguage(previous) !== isRtlLanguage(language);
  if (!needsRestart) return;
  syncLayoutDirection(language);
  try {
    await reloadAppAsync('Language changed');
  } catch {
    toast.info(t('settings.restartToApply'));
  }
}
