import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarClock, CircleCheckBig, Search, Settings, Sparkles, Timer } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitRing } from '@/components/habits/HabitRing';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { TaskItem } from '@/components/tasks/TaskItem';
import { AppText, EmptyState, IconButton, ProgressRing, SectionHeader, TAB_BAR_SPACE } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { useLanguage, useT } from '@/i18n';
import { checkInHabit } from '@/services/habitActions';
import { focusSecondsOn } from '@/services/statisticsService';
import { bulkUpdate } from '@/services/taskActions';
import { useFocusStore } from '@/store/focusStore';
import { completionKey, useHabitStore } from '@/store/habitStore';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import { radius, shadow, spacing, useTheme } from '@/theme';
import { formatDate, formatDuration, isoToDateKey } from '@/utils/date';
import { greetingKey } from '@/utils/format';
import { isScheduledOn } from '@/utils/habitStats';
import { isDone, isOpen, isOverdue, sortForDay, upcomingTasks } from '@/utils/taskFilters';

export default function TodayScreen() {
  const t = useT();
  const language = useLanguage();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useProjectStore((s) => s.projects);
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const sessions = useFocusStore((s) => s.sessions);
  const userName = useSettingsStore((s) => s.settings.userName);

  const data = useMemo(() => {
    const dueToday = tasks.filter((x) => !x.archived && x.dueDate === today);
    const overdue = sortForDay(tasks.filter((x) => isOverdue(x, today)));
    const completedToday = tasks.filter((x) => isDone(x) && x.completedAt && isoToDateKey(x.completedAt) === today);
    const openToday = dueToday.filter(isOpen);
    const priorities = [...openToday, ...overdue].filter((x) => x.priority >= 2).sort((a, b) => b.priority - a.priority).slice(0, 3);
    const priorityIds = new Set(priorities.map((p) => p.id));
    const todayList = sortForDay(dueToday.filter((x) => !priorityIds.has(x.id)));
    const total = dueToday.length + overdue.length;
    const done = dueToday.filter(isDone).length;
    return {
      overdue: overdue.filter((x) => !priorityIds.has(x.id)),
      priorities,
      todayList,
      upcoming: upcomingTasks(tasks, today, 7).slice(0, 5),
      total,
      done,
      remaining: openToday.length + overdue.length,
      completedToday: completedToday.length,
    };
  }, [tasks, today]);

  const todaysHabits = habits.filter((h) => !h.archived && isScheduledOn(h, today));
  const habitsDone = todaysHabits.filter((h) => (completions[completionKey(h.id, today)] ?? 0) >= h.targetPerDay).length;
  const focusSeconds = focusSecondsOn(sessions, today);
  const activeProjects = projects.filter((p) => !p.archived);
  const progress = data.total ? data.done / data.total : 0;
  const progressLabel =
    data.total === 0 ? t('today.progressNone') : data.done === data.total ? t('today.progressAllDone') : t('today.progressSome', { done: data.done, total: data.total });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: TAB_BAR_SPACE + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.flex}>
            <AppText variant="overline" tone="tertiary">
              {formatDate(today, language, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </AppText>
            <AppText variant="title" numberOfLines={1} accessibilityRole="header">
              {t(greetingKey())}
              {userName ? `, ${userName}` : ''}
            </AppText>
          </View>
          <IconButton icon={Search} variant="filled" onPress={() => router.push({ pathname: '/tasks', params: { search: '1' } })} accessibilityLabel={t('common.search')} />
          <IconButton icon={Settings} variant="filled" onPress={() => router.push('/settings')} accessibilityLabel={t('settings.title')} />
        </View>

        <Animated.View entering={FadeInDown.duration(450)}>
          <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadow(3, colors.gradientStart)]}>
            <View style={styles.heroTop}>
              <ProgressRing progress={progress} size={104} strokeWidth={11} color="#FFFFFF" trackColor="rgba(255,255,255,0.22)">
                <AppText variant="heading" color="#FFFFFF">
                  {Math.round(progress * 100)}%
                </AppText>
              </ProgressRing>
              <View style={styles.heroText}>
                <AppText variant="overline" color="rgba(255,255,255,0.75)">
                  {t('today.progress').toUpperCase()}
                </AppText>
                <AppText variant="heading" color="#FFFFFF">
                  {progressLabel}
                </AppText>
              </View>
            </View>
            <View style={styles.heroStats}>
              <HeroStat icon={CircleCheckBig} value={String(data.completedToday)} label={t('today.completed')} />
              <View style={styles.heroDivider} />
              <HeroStat icon={CalendarClock} value={String(data.remaining)} label={t('today.remaining')} />
              <View style={styles.heroDivider} />
              <HeroStat icon={Timer} value={formatDuration(focusSeconds)} label={t('today.focus')} onPress={() => router.push('/focus')} />
            </View>
          </LinearGradient>
        </Animated.View>

        {todaysHabits.length ? (
          <>
            <SectionHeader title={t('today.habits')} actionLabel={`${habitsDone}/${todaysHabits.length}`} onAction={() => router.navigate('/habits')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.habitRow}>
              {todaysHabits.map((h) => (
                <View key={h.id} style={styles.habitItem}>
                  <HabitRing habit={h} count={completions[completionKey(h.id, today)] ?? 0} onPress={() => void checkInHabit(h.id, today)} onLongPress={() => router.push({ pathname: '/habits/[id]', params: { id: h.id } })} />
                  <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.habitName}>
                    {h.name}
                  </AppText>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {data.priorities.length ? (
          <>
            <SectionHeader title={t('today.priorities')} count={data.priorities.length} />
            {data.priorities.map((task) => (
              <TaskItem key={task.id} task={task} today={today} />
            ))}
          </>
        ) : null}

        {data.overdue.length ? (
          <>
            <SectionHeader
              title={t('today.overdue')}
              count={data.overdue.length}
              color={colors.danger}
              actionLabel={t('calendar.reschedule')}
              onAction={() => void bulkUpdate(data.overdue.map((x) => x.id), { dueDate: today })}
            />
            {data.overdue.map((task) => (
              <TaskItem key={task.id} task={task} today={today} />
            ))}
          </>
        ) : null}

        <SectionHeader title={t('today.scheduled')} count={data.todayList.filter(isOpen).length} actionLabel={t('common.seeAll')} onAction={() => router.push({ pathname: '/tasks', params: { filter: 'today' } })} />
        {data.todayList.length ? (
          data.todayList.map((task) => <TaskItem key={task.id} task={task} today={today} showDate={false} />)
        ) : data.priorities.length === 0 ? (
          <EmptyState compact icon={Sparkles} title={t('today.allDone')} message={t('today.allDoneHint')} />
        ) : null}

        {data.upcoming.length ? (
          <>
            <SectionHeader title={t('today.upcoming')} actionLabel={t('common.seeAll')} onAction={() => router.push({ pathname: '/tasks', params: { filter: 'upcoming' } })} />
            {data.upcoming.map((task) => (
              <TaskItem key={task.id} task={task} today={today} />
            ))}
          </>
        ) : null}

        {activeProjects.length ? (
          <>
            <SectionHeader title={t('today.projects')} actionLabel={t('common.seeAll')} onAction={() => router.push('/projects')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectRow}>
              {activeProjects.map((p) => (
                <ProjectCard key={p.id} project={p} variant="compact" />
              ))}
            </ScrollView>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function HeroStat({ icon: Icon, value, label, onPress }: { icon: typeof Timer; value: string; label: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.heroStat} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={`${label}: ${value}`}>
      <Icon size={16} color="rgba(255,255,255,0.8)" />
      <AppText variant="subheading" color="#FFFFFF">
        {value}
      </AppText>
      <AppText variant="caption" color="rgba(255,255,255,0.75)">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  hero: { borderRadius: radius.xxl, padding: spacing.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  heroText: { flex: 1, gap: spacing.xs },
  heroStats: { flexDirection: 'row', marginTop: spacing.xl, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.lg, paddingVertical: spacing.md },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: spacing.xs },
  habitRow: { gap: spacing.lg, paddingRight: spacing.lg },
  habitItem: { alignItems: 'center', width: 64, gap: spacing.xs },
  habitName: { maxWidth: 64 },
  projectRow: { gap: spacing.md, paddingRight: spacing.lg, paddingBottom: spacing.xs },
});
