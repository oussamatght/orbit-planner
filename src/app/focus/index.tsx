import { Settings2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { FocusHistory, FocusSettingsSheet, FocusStats, FocusTaskCard, FocusTimer } from '@/components/focus';
import { IconButton, Screen, SegmentedControl } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { useT } from '@/i18n';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function FocusScreen() {
  const t = useT();
  const today = useToday();
  const mode = useFocusStore((s) => s.mode);
  const setMode = useFocusStore((s) => s.setMode);
  const syncDurations = useFocusStore((s) => s.syncDurations);
  const focusMinutes = useSettingsStore((s) => s.settings.focusMinutes);
  const shortBreakMinutes = useSettingsStore((s) => s.settings.shortBreakMinutes);
  const longBreakMinutes = useSettingsStore((s) => s.settings.longBreakMinutes);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // When durations change while the timer is idle, show the new length immediately.
  useEffect(() => {
    syncDurations();
  }, [focusMinutes, shortBreakMinutes, longBreakMinutes, syncDurations]);

  return (
    <Screen
      back
      title={t('focus.title')}
      large
      right={<IconButton icon={Settings2} onPress={() => setSettingsOpen(true)} accessibilityLabel={t('focus.durations')} variant="filled" size={18} />}
    >
      <SegmentedControl
        options={[
          { value: 'focus', label: t('focus.focus') },
          { value: 'short_break', label: t('focus.shortBreak') },
          { value: 'long_break', label: t('focus.longBreak') },
        ]}
        value={mode}
        onChange={setMode}
      />
      <FocusTimer />
      <FocusTaskCard />
      <FocusStats today={today} />
      <FocusHistory today={today} />
      <FocusSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Screen>
  );
}
