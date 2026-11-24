import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguage } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';
import type { DateKey } from '@/types/models';
import { fromDateKey, isSameMonth, monthGrid } from '@/utils/date';
import { weekdayNarrow } from '@/utils/format';
import { haptics } from '@/utils/haptics';

import { AppText } from '../ui/AppText';

export interface DayMarker {
  /** Up to three dot colors shown under the day number. */
  dots: string[];
  overdue?: boolean;
}

interface Props {
  month: DateKey;
  selected: DateKey | null;
  today: DateKey;
  weekStartsOn: number;
  onSelect: (day: DateKey) => void;
  markers?: Record<DateKey, DayMarker>;
  compact?: boolean;
}

export const MonthGrid = memo(function MonthGrid({ month, selected, today, weekStartsOn, onSelect, markers, compact }: Props) {
  const { colors } = useTheme();
  const language = useLanguage();
  const days = monthGrid(month, weekStartsOn);
  const cell = compact ? 38 : 44;

  return (
    <View>
      <View style={styles.row}>
        {Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7).map((d) => (
          <View key={d} style={styles.cell}>
            <AppText variant="caption" tone="tertiary">
              {weekdayNarrow(d, language)}
            </AppText>
          </View>
        ))}
      </View>
      {Array.from({ length: 6 }, (_, week) => (
        <View key={week} style={styles.row}>
          {days.slice(week * 7, week * 7 + 7).map((day) => {
            const inMonth = isSameMonth(day, month);
            const isSelected = day === selected;
            const isToday = day === today;
            const marker = markers?.[day];
            return (
              <Pressable
                key={day}
                style={styles.cell}
                onPress={() => {
                  haptics.selection();
                  onSelect(day);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={fromDateKey(day).toDateString()}
              >
                <View
                  style={[
                    styles.day,
                    { width: cell, height: cell, borderRadius: radius.md },
                    isSelected && { backgroundColor: colors.primary },
                    !isSelected && isToday && { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <AppText
                    variant={isToday || isSelected ? 'label' : 'bodyMedium'}
                    color={
                      isSelected ? colors.onPrimary : isToday ? colors.primaryText : inMonth ? colors.text : colors.textTertiary
                    }
                    style={!inMonth && !isSelected ? styles.faded : undefined}
                  >
                    {Number(day.slice(8))}
                  </AppText>
                  <View style={styles.dots}>
                    {marker?.dots.slice(0, 3).map((c, i) => (
                      <View
                        key={`${c}-${i}`}
                        style={[styles.dot, { backgroundColor: isSelected ? colors.onPrimary : marker.overdue ? colors.danger : c }]}
                      />
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  day: { alignItems: 'center', justifyContent: 'center' },
  faded: { opacity: 0.5 },
  dots: { flexDirection: 'row', gap: 2, height: 5, marginTop: 1 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});

export const monthGridSpacing = spacing.sm;
