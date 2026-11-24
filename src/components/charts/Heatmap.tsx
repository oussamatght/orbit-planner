import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguage } from '@/i18n';
import { spacing, useTheme, withAlpha } from '@/theme';
import type { DateKey } from '@/types/models';
import { addDays, startOfWeek } from '@/utils/date';
import { weekdayNarrow } from '@/utils/format';

import { AppText } from '../ui/AppText';

interface Props {
  today: DateKey;
  weeks: number;
  weekStartsOn: number;
  color: string;
  /** Intensity 0..1 for a given day, or null when the day is not applicable. */
  valueFor: (day: DateKey) => number | null;
  onPressDay?: (day: DateKey) => void;
  cell?: number;
}

/** GitHub-style contribution grid: columns are weeks, rows are weekdays. */
export function Heatmap({ today, weeks, weekStartsOn, color, valueFor, onPressDay, cell = 16 }: Props) {
  const { colors } = useTheme();
  const language = useLanguage();
  const lastWeekStart = startOfWeek(today, weekStartsOn);
  const firstWeekStart = addDays(lastWeekStart, -7 * (weeks - 1));
  const gap = 4;

  return (
    <View style={styles.root}>
      <View style={[styles.labels, { gap }]}>
        {Array.from({ length: 7 }, (_, i) => (
          <View key={i} style={{ height: cell, justifyContent: 'center' }}>
            {i % 2 === 0 ? (
              <AppText variant="caption" tone="tertiary" style={styles.label}>
                {weekdayNarrow((weekStartsOn + i) % 7, language)}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
      <View style={[styles.grid, { gap }]}>
        {Array.from({ length: weeks }, (_, w) => (
          <View key={w} style={{ gap }}>
            {Array.from({ length: 7 }, (_, d) => {
              const day = addDays(firstWeekStart, w * 7 + d);
              const future = day > today;
              const value = future ? null : valueFor(day);
              const bg =
                value === null
                  ? future
                    ? 'transparent'
                    : withAlpha(colors.textTertiary, 0.08)
                  : value <= 0
                    ? withAlpha(color, 0.1)
                    : withAlpha(color, 0.3 + Math.min(1, value) * 0.7);
              return (
                <Pressable
                  key={day}
                  disabled={future || !onPressDay}
                  onPress={() => onPressDay?.(day)}
                  style={[
                    { width: cell, height: cell, borderRadius: cell * 0.28, backgroundColor: bg },
                    day === today && { borderWidth: 1.5, borderColor: color },
                  ]}
                  accessibilityLabel={`${day}: ${value === null ? '-' : Math.round(value * 100)}%`}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', gap: spacing.sm },
  labels: {},
  label: { fontSize: 10 },
  grid: { flexDirection: 'row', flex: 1, justifyContent: 'space-between' },
});
