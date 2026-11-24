import { useEffect } from 'react';
import { AppState } from 'react-native';

import { t } from '@/i18n';
import { useFocusStore } from '@/store/focusStore';
import { toast } from '@/store/uiStore';
import { haptics } from '@/utils/haptics';

/**
 * App-wide watcher for the Pomodoro timer so a session completes (and is recorded)
 * even if the Focus screen is not open, including after returning from background.
 */
export function useFocusTicker(): void {
  const status = useFocusStore((s) => s.status);

  useEffect(() => {
    if (status !== 'running') return;
    const check = async () => {
      const finished = await useFocusStore.getState().tick();
      if (finished) {
        haptics.success();
        toast.success(finished === 'focus' ? t('focus.sessionDone') : t('focus.breakDone'));
      }
    };
    const interval = setInterval(() => void check(), 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [status]);
}
