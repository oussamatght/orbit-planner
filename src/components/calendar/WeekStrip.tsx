import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguage } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';
import type { DateKey } from '@/types/models';
import { formatDate, weekDays } from '@/utils/date';
import { haptics } from '@/utils/haptics';

import { AppText } from '../ui/AppText';

interface Props {
  anchor: DateKey;
  selected: DateKey;
  today: DateKey;
  weekStartsOn: number;
  counts: Record<DateKey, number>;
  onSelect: (day: DateKey) => void;
}

/** A row of seven day pills with task-count dots. */
export function WeekStrip({ anchor, selected, today, weekStartsOn, counts, onSelect }: Props) {
  const { colors } = useTheme();
  const language = useLanguage();
  return (
    <View style={styles.row}>
      {weekDays(anchor, weekStartsOn).map((day) => {
        const isSelected = day === selected;
        const isToday = day === today;
        const count = counts[day] ?? 0;
        return (
          <Pressable
            key={day}
            onPress={() => {
              haptics.selection();
              onSelect(day);
            }}
            style={[
              styles.day,
              { backgroundColor: isSelected ? colors.primary : isToday ? colors.primarySoft : colors.surface, borderColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${formatDate(day, language, { weekday: 'long', day: 'numeric', month: 'long' })}, ${count}`}
          >
            <AppText variant="caption" color={isSelected ? 'rgba(255,255,255,0.8)' : colors.textTertiary}>
              {formatDate(day, language, { weekday: 'short' }).replace('.', '')}
            </AppText>
            <AppText variant="subheading" color={isSelected ? colors.onPrimary : isToday ? colors.primaryText : colors.text}>
              {Number(day.slice(8))}
            </AppText>
            <View style={styles.dots}>
              {Array.from({ length: Math.min(3, count) }, (_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: isSelected ? colors.onPrimary : colors.primary }]} />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs + 2 },
  day: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  dots: { flexDirection: 'row', gap: 2, height: 5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
