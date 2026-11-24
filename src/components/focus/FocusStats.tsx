import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { focusSecondsOn } from '@/services/statisticsService';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing } from '@/theme';
import type { DateKey } from '@/types/models';
import { formatDuration, isoToDateKey } from '@/utils/date';

import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { SectionHeader } from '../ui/SectionHeader';

import { MODE_COLORS } from './focusModes';

/** Today's completed sessions, total focus time and progress toward the daily goal. */
export function FocusStats({ today }: { today: DateKey }) {
  const t = useT();
  const sessions = useFocusStore((s) => s.sessions);
  const goalMinutes = useSettingsStore((s) => s.settings.dailyFocusGoalMinutes);

  const completedToday = sessions.filter((s) => s.mode === 'focus' && s.completed && isoToDateKey(s.startedAt) === today).length;
  const focusToday = focusSecondsOn(sessions, today);
  const goalSeconds = goalMinutes * 60;

  return (
    <View>
      <SectionHeader title={t('focus.todayStats')} />
      <View style={styles.stats}>
        <Card style={styles.stat}>
          <AppText variant="caption" tone="tertiary">
            {t('focus.sessions')}
          </AppText>
          <AppText variant="title">{completedToday}</AppText>
        </Card>
        <Card style={styles.stat}>
          <AppText variant="caption" tone="tertiary">
            {t('focus.focusTime')}
          </AppText>
          <AppText variant="title">{formatDuration(focusToday)}</AppText>
        </Card>
      </View>
      <Card style={styles.goal}>
        <View style={styles.rowBetween}>
          <AppText variant="label">{t('focus.goal')}</AppText>
          <AppText variant="label" tone="secondary">
            {formatDuration(focusToday)} / {formatDuration(goalSeconds)}
          </AppText>
        </View>
        <ProgressBar progress={goalSeconds ? focusToday / goalSeconds : 0} color={MODE_COLORS.focus[0]} height={8} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: spacing.xs },
  goal: { marginTop: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
});
