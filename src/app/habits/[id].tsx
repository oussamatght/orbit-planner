import { router, useLocalSearchParams } from 'expo-router';
import { Archive, ArchiveRestore, Bell, CalendarCheck, Flame, Pencil, SearchX, Target, Trash2, Trophy } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';

import { Heatmap } from '@/components/charts/Heatmap';
import { HabitRing } from '@/components/habits/HabitRing';
import { AppText, Button, Card, EmptyState, IconButton, ProgressBar, Screen, SectionHeader } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { useLanguage, useT } from '@/i18n';
import { checkInHabit } from '@/services/habitActions';
import { completionKey, useHabitStore } from '@/store/habitStore';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import { radius, spacing, useTheme, withAlpha } from '@/theme';
import type { DateKey } from '@/types/models';
import { addDays, formatTime } from '@/utils/date';
import { weekdayShort } from '@/utils/format';
import { completionRate, isScheduledOn, streaks, totalCheckIns, weekProgress } from '@/utils/habitStats';
import { haptics } from '@/utils/haptics';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const language = useLanguage();
  const today = useToday();
  const { colors } = useTheme();
  const habit = useHabitStore((s) => s.habits.find((h) => h.id === id));
  const completions = useHabitStore((s) => s.completions);
  const { deleteHabit, updateHabit } = useHabitStore.getState();
  const weekStartsOn = useSettingsStore((s) => s.settings.weekStartsOn);

  if (!habit) {
    return (
      <Screen back>
        <EmptyState icon={SearchX} title={t('habits.empty')} actionLabel={t('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }

  const lookup = (hid: string, d: DateKey) => completions[completionKey(hid, d)] ?? 0;
  const streak = streaks(habit, today, lookup, weekStartsOn);
  const rate30 = completionRate(habit, today, 30, lookup);
  const total = totalCheckIns(habit, completions);
  const week = weekProgress(habit, today, lookup, weekStartsOn);
  const monthDays = Number(today.slice(8));
  const monthRate = completionRate(habit, today, monthDays, lookup);
  const UNITS = { en: { weeks: 'wk', days: 'd' }, fr: { weeks: 'sem.', days: 'j' }, ar: { weeks: 'أسبوع', days: 'ي' } } as const;
  const unit = UNITS[language][streak.unit];

  const frequencyLabel =
    habit.frequency.type === 'daily'
      ? t('habits.freq.daily')
      : habit.frequency.type === 'weekly'
        ? t('habits.timesPerWeek', { count: habit.frequency.timesPerWeek })
        : habit.frequency.days.map((d) => weekdayShort(d, language)).join(', ');

  const confirmDelete = () =>
    Alert.alert(t('habits.deleteConfirm'), t('habits.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHabit(habit.id);
            haptics.medium();
            router.back();
          } catch {
            toast.error(t('error.saveFailed'));
          }
        },
      },
    ]);

  return (
    <Screen
      back
      right={
        <>
          <IconButton icon={Pencil} onPress={() => router.push({ pathname: '/habits/edit', params: { id: habit.id } })} accessibilityLabel={t('common.edit')} variant="filled" size={18} />
          <IconButton icon={Trash2} onPress={confirmDelete} accessibilityLabel={t('common.delete')} variant="filled" size={18} color={colors.danger} />
        </>
      }
    >
      <View style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: withAlpha(habit.color, 0.16) }]}>
          <AppIcon name={habit.icon} size={30} color={habit.color} />
        </View>
        <AppText variant="title" align="center">
          {habit.name}
        </AppText>
        {habit.description ? (
          <AppText variant="body" tone="secondary" align="center">
            {habit.description}
          </AppText>
        ) : null}
        <View style={styles.badges}>
          <Badge icon={CalendarCheck} label={frequencyLabel} color={habit.color} />
          {habit.targetPerDay > 1 ? <Badge icon={Target} label={`${habit.targetPerDay}× / ${t('common.today').toLowerCase()}`} color={habit.color} /> : null}
          {habit.reminderTime ? <Badge icon={Bell} label={formatTime(habit.reminderTime, language)} color={habit.color} /> : null}
        </View>
        {isScheduledOn(habit, today) ? (
          <View style={styles.checkin}>
            <HabitRing habit={habit} count={lookup(habit.id, today)} size={84} onPress={() => void checkInHabit(habit.id, today)} />
          </View>
        ) : null}
      </View>

      <View style={styles.grid}>
        <Stat icon={Flame} color="#F97316" value={`${streak.current} ${unit}`} label={t('habits.streak')} />
        <Stat icon={Trophy} color="#F5A524" value={`${streak.best} ${unit}`} label={t('habits.bestStreak')} />
        <Stat icon={Target} color={habit.color} value={`${Math.round(rate30 * 100)}%`} label={`${t('habits.completionRate')} · 30 ${UNITS[language].days}`} />
        <Stat icon={CalendarCheck} color="#22C55E" value={String(total)} label={t('habits.totalCheckins')} />
      </View>

      <Card style={styles.card}>
        <View style={styles.progressRow}>
          <AppText variant="label">{t('habits.thisWeek')}</AppText>
          <AppText variant="label" tone="secondary">
            {week.done}/{week.target}
          </AppText>
        </View>
        <ProgressBar progress={week.target ? week.done / week.target : 0} color={habit.color} height={8} />
        <View style={[styles.progressRow, styles.spaced]}>
          <AppText variant="label">{t('habits.thisMonth')}</AppText>
          <AppText variant="label" tone="secondary">
            {Math.round(monthRate * 100)}%
          </AppText>
        </View>
        <ProgressBar progress={monthRate} color={habit.color} height={8} />
      </Card>

      <SectionHeader title={t('habits.last12Weeks')} />
      <Card style={styles.card}>
        <Heatmap
          today={today}
          weeks={12}
          weekStartsOn={weekStartsOn}
          color={habit.color}
          valueFor={(d) => (isScheduledOn(habit, d) || lookup(habit.id, d) > 0 ? lookup(habit.id, d) / habit.targetPerDay : null)}
          onPressDay={(d) => d >= addDays(today, -365) && void checkInHabit(habit.id, d)}
        />
      </Card>

      <View style={styles.actions}>
        <Button
          label={habit.archived ? t('common.unarchive') : t('common.archive')}
          icon={habit.archived ? ArchiveRestore : Archive}
          variant="secondary"
          onPress={() => void updateHabit(habit.id, { archived: !habit.archived }).then(() => haptics.success())}
          fullWidth
        />
      </View>
    </Screen>
  );
}

function Badge({ icon: Icon, label, color }: { icon: typeof Bell; label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.12) }]}>
      <Icon size={13} color={color} />
      <AppText variant="caption" color={color}>
        {label}
      </AppText>
    </View>
  );
}

function Stat({ icon: Icon, color, value, label }: { icon: typeof Bell; color: string; value: string; label: string }) {
  return (
    <Card style={styles.stat}>
      <Icon size={18} color={color} />
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" tone="tertiary" numberOfLines={1}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  icon: { width: 64, height: 64, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  checkin: { marginTop: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xxl },
  stat: { flexBasis: '47%', flexGrow: 1, gap: spacing.xs },
  card: { marginTop: spacing.md },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  spaced: { marginTop: spacing.lg },
  actions: { marginTop: spacing.xxl },
});
