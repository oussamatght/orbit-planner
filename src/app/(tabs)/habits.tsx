import { router } from 'expo-router';
import { Flame, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitCard } from '@/components/habits/HabitCard';
import { WeekStrip } from '@/components/calendar/WeekStrip';
import { AppText, Card, EmptyState, IconButton, ProgressBar, TAB_BAR_SPACE } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { useT } from '@/i18n';
import { completionKey, useHabitStore } from '@/store/habitStore';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing, useTheme } from '@/theme';
import type { DateKey } from '@/types/models';
import { isScheduledOn } from '@/utils/habitStats';

export default function HabitsScreen() {
  const t = useT();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const weekStartsOn = useSettingsStore((s) => s.settings.weekStartsOn);
  const [date, setDate] = useState<DateKey>(today);

  const active = habits.filter((h) => !h.archived);
  const scheduled = active.filter((h) => isScheduledOn(h, date));
  const done = scheduled.filter((h) => (completions[completionKey(h.id, date)] ?? 0) >= h.targetPerDay).length;
  const counts: Record<DateKey, number> = {};
  const create = () => router.push('/habits/edit');

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <AppText variant="title" style={styles.flex} accessibilityRole="header">
          {t('habits.title')}
        </AppText>
        <IconButton icon={Plus} variant="primary" onPress={create} accessibilityLabel={t('habits.new')} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {active.length === 0 ? (
          <EmptyState icon={Flame} color="#F97316" title={t('habits.empty')} message={t('habits.emptyHint')} actionLabel={t('habits.new')} onAction={create} />
        ) : (
          <>
            <WeekStrip anchor={today} selected={date} today={today} weekStartsOn={weekStartsOn} counts={counts} onSelect={(d) => d <= today && setDate(d)} />
            <Card style={styles.summary}>
              <View style={styles.summaryRow}>
                <AppText variant="subheading">{t('habits.todayProgress', { done, total: scheduled.length })}</AppText>
                <AppText variant="label" tone="accent">
                  {scheduled.length ? Math.round((done / scheduled.length) * 100) : 0}%
                </AppText>
              </View>
              <ProgressBar progress={scheduled.length ? done / scheduled.length : 0} height={8} color="#F97316" />
            </Card>
            {active.map((h) => (
              <HabitCard key={h.id} habit={h} date={date} today={today} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  content: { paddingHorizontal: spacing.lg },
  summary: { marginVertical: spacing.lg, gap: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
