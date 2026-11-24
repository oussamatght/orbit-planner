import { router } from 'expo-router';
import { Flame } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguage, useT } from '@/i18n';
import { checkInHabit, resetHabitDay } from '@/services/habitActions';
import { completionKey, useHabitStore } from '@/store/habitStore';
import { useSettingsStore } from '@/store/settingsStore';
import { radius, spacing, useTheme, withAlpha } from '@/theme';
import type { DateKey, Habit } from '@/types/models';
import { weekDays, weekday } from '@/utils/date';
import { weekdayNarrow } from '@/utils/format';
import { isScheduledOn, streaks, weekProgress } from '@/utils/habitStats';

import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { HabitRing } from './HabitRing';

interface Props {
  habit: Habit;
  date: DateKey;
  today: DateKey;
}

export const HabitCard = memo(function HabitCard({ habit, date, today }: Props) {
  const t = useT();
  const language = useLanguage();
  const { colors } = useTheme();
  const completions = useHabitStore((s) => s.completions);
  const weekStartsOn = useSettingsStore((s) => s.settings.weekStartsOn);
  const count = (d: DateKey) => completions[completionKey(habit.id, d)] ?? 0;
  const lookup = (id: string, d: DateKey) => completions[completionKey(id, d)] ?? 0;

  const scheduled = isScheduledOn(habit, date);
  const streak = streaks(habit, today, lookup, weekStartsOn);
  const week = weekProgress(habit, today, lookup, weekStartsOn);
  const days = weekDays(today, weekStartsOn);

  const subtitle =
    habit.frequency.type === 'weekly'
      ? t('habits.timesPerWeek', { count: habit.frequency.timesPerWeek })
      : habit.targetPerDay > 1
        ? `${count(date)}/${habit.targetPerDay}`
        : !scheduled
          ? t('habits.notScheduled')
          : habit.description || t('habits.freq.daily');

  return (
    <Card onPress={() => router.push({ pathname: '/habits/[id]', params: { id: habit.id } })} style={styles.card} accessibilityLabel={habit.name}>
      <View style={styles.row}>
        <HabitRing
          habit={habit}
          count={count(date)}
          size={56}
          disabled={!scheduled}
          onPress={() => void checkInHabit(habit.id, date)}
          onLongPress={() => void resetHabitDay(habit.id, date)}
        />
        <View style={styles.body}>
          <AppText variant="subheading" numberOfLines={1}>
            {habit.name}
          </AppText>
          <AppText variant="caption" tone="tertiary" numberOfLines={1}>
            {subtitle}
          </AppText>
          <View style={styles.week}>
            {days.map((d) => {
              const done = count(d) >= habit.targetPerDay;
              const applicable = isScheduledOn(habit, d) && d <= today;
              return (
                <Pressable
                  key={d}
                  disabled={d > today}
                  onPress={() => void checkInHabit(habit.id, d)}
                  hitSlop={4}
                  accessibilityLabel={`${d} ${done ? 'done' : ''}`}
                  style={[
                    styles.dayDot,
                    {
                      backgroundColor: done ? habit.color : applicable ? withAlpha(habit.color, 0.12) : 'transparent',
                      borderColor: d === date ? habit.color : 'transparent',
                    },
                  ]}
                >
                  <AppText variant="caption" color={done ? '#FFFFFF' : d > today ? colors.textTertiary : colors.textSecondary} style={styles.dayText}>
                    {weekdayNarrow(weekday(d), language)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.streak}>
          <Flame size={18} color={streak.current > 0 ? '#F97316' : colors.textTertiary} fill={streak.current > 0 ? '#FDBA74' : 'transparent'} />
          <AppText variant="subheading" color={streak.current > 0 ? colors.text : colors.textTertiary}>
            {streak.current}
          </AppText>
          <AppText variant="caption" tone="tertiary">
            {week.done}/{week.target}
          </AppText>
        </View>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 2 },
  week: { flexDirection: 'row', gap: 5, marginTop: spacing.sm },
  dayDot: { width: 22, height: 22, borderRadius: radius.xs + 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  dayText: { fontSize: 10, lineHeight: 12 },
  streak: { alignItems: 'center', minWidth: 40, gap: 1 },
});
