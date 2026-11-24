import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import { spacing } from '@/theme';
import type { AppSettings } from '@/types/models';

import { AppText } from '../ui/AppText';
import { Stepper } from '../ui/Pickers';
import { Sheet } from '../ui/Sheet';

interface RowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  minutes?: boolean;
  onChange: (value: number) => void;
}

function DurationRow({ label, value, min, max, step = 1, minutes = true, onChange }: RowProps) {
  return (
    <View style={styles.row}>
      <AppText variant="bodyMedium" style={styles.flex}>
        {label}
      </AppText>
      <Stepper label={label} value={value} min={min} max={max} step={step} onChange={onChange} format={minutes ? (v) => `${v} min` : undefined} />
    </View>
  );
}

/** Custom Pomodoro durations, cycle length and daily goal (saved to settings immediately). */
export function FocusSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const set = (patch: Partial<AppSettings>) => void update(patch).catch(() => toast.error(t('error.saveFailed')));

  return (
    <Sheet visible={visible} onClose={onClose} title={t('focus.durations')}>
      <DurationRow label={t('settings.focusLength')} value={settings.focusMinutes} min={5} max={120} step={5} onChange={(v) => set({ focusMinutes: v })} />
      <DurationRow label={t('settings.shortBreak')} value={settings.shortBreakMinutes} min={1} max={30} onChange={(v) => set({ shortBreakMinutes: v })} />
      <DurationRow label={t('settings.longBreak')} value={settings.longBreakMinutes} min={5} max={60} step={5} onChange={(v) => set({ longBreakMinutes: v })} />
      <DurationRow label={t('settings.sessionsBeforeLong')} value={settings.sessionsBeforeLongBreak} min={2} max={8} minutes={false} onChange={(v) => set({ sessionsBeforeLongBreak: v })} />
      <DurationRow label={t('settings.dailyGoal')} value={settings.dailyFocusGoalMinutes} min={15} max={600} step={15} onChange={(v) => set({ dailyFocusGoalMinutes: v })} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
});
