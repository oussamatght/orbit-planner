import { BarChart3, CheckCircle2, Flame, Percent, Timer, TrendingUp } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';

import { BarChart } from '@/components/charts/BarChart';
import { SegmentedBar } from '@/components/charts/SegmentedBar';
import { AppText, Card, EmptyState, ProgressBar, Screen, SectionHeader, SegmentedControl } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { useLanguage, useT } from '@/i18n';
import {
  completedByDay,
  completedByMonth,
  completedByWeek,
  completionRateFor,
  focusSecondsByDay,
  habitConsistency,
  openByPriority,
  productiveStreak,
  projectBreakdown,
} from '@/services/statisticsService';
import { useFocusStore } from '@/store/focusStore';
import { completionKey, useHabitStore } from '@/store/habitStore';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import { radius, spacing, useTheme, withAlpha } from '@/theme';
import { PRIORITIES, PRIORITY_KEYS, type DateKey } from '@/types/models';
import { addDays, formatDate, formatDuration, startOfWeek } from '@/utils/date';

export default function StatisticsScreen() {
  const t = useT();
  const language = useLanguage();
  const today = useToday();
  const { colors } = useTheme();
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useProjectStore((s) => s.projects);
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const sessions = useFocusStore((s) => s.sessions);
  const weekStartsOn = useSettingsStore((s) => s.settings.weekStartsOn);
  const [range, setRange] = useState<'weeks' | 'months'>('weeks');

  const stats = useMemo(() => {
    const weekStart = startOfWeek(today, weekStartsOn);
    const last7 = completedByDay(tasks, addDays(today, -6), 7);
    const thisWeek = completedByDay(tasks, weekStart, 7).reduce((s, d) => s + d.value, 0);
    const focusWeek = focusSecondsByDay(sessions, weekStart, 7);
    return {
      doneToday: last7[6]?.value ?? 0,
      thisWeek,
      rate: completionRateFor(tasks, today, 30),
      streak: productiveStreak(tasks, today),
      last7,
      weekly: completedByWeek(tasks, today, 12, weekStartsOn),
      monthly: completedByMonth(tasks, today, 6),
      focusWeek,
      focusWeekTotal: focusWeek.reduce((s, d) => s + d.value, 0),
      priority: openByPriority(tasks),
      projects: projectBreakdown(projects, tasks),
    };
  }, [tasks, sessions, projects, today, weekStartsOn]);

  const consistency = useMemo(
    () => habitConsistency(habits, today, (id: string, d: DateKey) => completions[completionKey(id, d)] ?? 0, 30),
    [habits, completions, today],
  );

  const dayLabel = (d: DateKey) => formatDate(d, language, { weekday: 'narrow' });
  const hasAnyData = tasks.length > 0 || sessions.length > 0 || habits.length > 0;

  if (!hasAnyData) {
    return (
      <Screen back title={t('stats.title')} large>
        <EmptyState icon={BarChart3} title={t('stats.noData')} message={t('myTasks.emptyHint')} />
      </Screen>
    );
  }

  return (
    <Screen back title={t('stats.title')} large>
      <View style={styles.tiles}>
        <Tile icon={CheckCircle2} tint={colors.success} value={String(stats.doneToday)} label={t('stats.today')} />
        <Tile icon={TrendingUp} tint={colors.primary} value={String(stats.thisWeek)} label={t('stats.week')} />
        <Tile icon={Percent} tint="#8B5CF6" value={`${Math.round(stats.rate * 100)}%`} label={t('stats.completionRate')} />
        <Tile icon={Flame} tint="#F97316" value={String(stats.streak)} label={t('stats.streak')} />
      </View>

      <SectionHeader title={t('stats.weekly')} />
      <Card>
        <BarChart
          data={stats.last7.map((d) => ({
            key: d.date,
            label: dayLabel(d.date),
            longLabel: formatDate(d.date, language, { weekday: 'long', day: 'numeric', month: 'short' }),
            value: d.value,
          }))}
          color={colors.primary}
          format={(v) => `${v} ${t('stats.tasksCompleted')}`}
        />
      </Card>

      <SectionHeader title={t('stats.monthly')} />
      <Card>
        <View style={styles.segment}>
          <SegmentedControl
            options={[
              { value: 'weeks', label: t('calendar.week') },
              { value: 'months', label: t('calendar.month') },
            ]}
            value={range}
            onChange={setRange}
          />
        </View>
        {range === 'weeks' ? (
          <BarChart
            data={stats.weekly.map((d) => ({
              key: d.date,
              label: formatDate(d.date, language, { day: 'numeric', month: 'numeric' }),
              longLabel: formatDate(d.date, language, { day: 'numeric', month: 'long' }),
              value: d.value,
            }))}
            color={colors.primary}
            labelEvery={3}
            format={(v) => `${v} ${t('stats.tasksCompleted')}`}
          />
        ) : (
          <BarChart
            data={stats.monthly.map((d) => ({
              key: d.date,
              label: formatDate(d.date, language, { month: 'short' }),
              longLabel: formatDate(d.date, language, { month: 'long', year: 'numeric' }),
              value: d.value,
            }))}
            color={colors.primary}
            format={(v) => `${v} ${t('stats.tasksCompleted')}`}
          />
        )}
      </Card>

      <SectionHeader title={t('stats.focusWeek')} actionLabel={formatDuration(stats.focusWeekTotal)} />
      <Card>
        <BarChart
          data={stats.focusWeek.map((d) => ({
            key: d.date,
            label: dayLabel(d.date),
            longLabel: formatDate(d.date, language, { weekday: 'long', day: 'numeric', month: 'short' }),
            value: Math.round(d.value / 60),
          }))}
          color="#14B8A6"
          highlightKey={today}
          format={(v) => formatDuration(v * 60)}
        />
      </Card>

      <SectionHeader title={t('stats.priorityBreakdown')} />
      <Card>
        <SegmentedBar
          segments={[...PRIORITIES].reverse().map((p) => ({
            key: String(p),
            label: t(`priority.${PRIORITY_KEYS[p]}`),
            value: stats.priority[p],
            color: colors.priority[PRIORITY_KEYS[p]],
          }))}
        />
      </Card>

      <SectionHeader title={t('stats.habitConsistency')} />
      {consistency.length ? (
        <Card>
          {consistency.map(({ habit, rate }, i) => {
            return (
              <View key={habit.id} style={[styles.rateRow, i > 0 && styles.rateGap]}>
                <View style={[styles.rateIcon, { backgroundColor: withAlpha(habit.color, 0.15) }]}>
                  <AppIcon name={habit.icon} size={15} color={habit.color} />
                </View>
                <View style={styles.flex}>
                  <View style={styles.rateHead}>
                    <AppText variant="label" numberOfLines={1} style={styles.flex}>
                      {habit.name}
                    </AppText>
                    <AppText variant="label" tone="secondary">
                      {Math.round(rate * 100)}%
                    </AppText>
                  </View>
                  <ProgressBar progress={rate} color={habit.color} />
                </View>
              </View>
            );
          })}
          <AppText variant="caption" tone="tertiary" style={styles.footnote}>
            {t('stats.last30')}
          </AppText>
        </Card>
      ) : (
        <AppText variant="label" tone="tertiary">
          {t('stats.noData')}
        </AppText>
      )}

      <SectionHeader title={t('stats.projectProgress')} />
      {stats.projects.length ? (
        <Card>
          {stats.projects.map(({ project, percent, done, total }, i) => (
            <View key={project.id} style={[styles.rateRow, i > 0 && styles.rateGap]}>
              <View style={[styles.rateIcon, { backgroundColor: withAlpha(project.color, 0.15) }]}>
                <AppIcon name={project.icon} size={15} color={project.color} />
              </View>
              <View style={styles.flex}>
                <View style={styles.rateHead}>
                  <AppText variant="label" numberOfLines={1} style={styles.flex}>
                    {project.name}
                  </AppText>
                  <AppText variant="label" tone="secondary">
                    {done}/{total} · {percent}%
                  </AppText>
                </View>
                <ProgressBar progress={percent / 100} color={project.color} />
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <AppText variant="label" tone="tertiary">
          {t('stats.noData')}
        </AppText>
      )}
      <View style={styles.bottomIcon}>
        <Timer size={14} color={colors.textTertiary} />
        <AppText variant="caption" tone="tertiary">
          {t('settings.storageValue')}
        </AppText>
      </View>
    </Screen>
  );
}

function Tile({ icon: Icon, tint, value, label }: { icon: typeof Flame; tint: string; value: string; label: string }) {
  return (
    <Card style={styles.tile} accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.tileIcon, { backgroundColor: withAlpha(tint, 0.14) }]}>
        <Icon size={16} color={tint} />
      </View>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" tone="tertiary" numberOfLines={1}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexBasis: '47%', flexGrow: 1, gap: 2 },
  tileIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  segment: { marginBottom: spacing.md },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rateGap: { marginTop: spacing.lg },
  rateIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rateHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: spacing.sm },
  footnote: { marginTop: spacing.md },
  bottomIcon: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xxl },
});
