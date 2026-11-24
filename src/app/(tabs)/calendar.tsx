import { CalendarCheck, CalendarX2, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayTimeline } from '@/components/calendar/DayTimeline';
import { MonthGrid, type DayMarker } from '@/components/calendar/MonthGrid';
import { WeekStrip } from '@/components/calendar/WeekStrip';
import { TaskItem } from '@/components/tasks/TaskItem';
import { DatePanel } from '@/components/tasks/panels';
import { AppText, Button, Card, EmptyState, IconButton, SectionHeader, SegmentedControl, Sheet, TAB_BAR_SPACE } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { useLanguage, useT } from '@/i18n';
import { updateTask } from '@/services/taskActions';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { spacing, useTheme } from '@/theme';
import type { DateKey, Task } from '@/types/models';
import { addDays, addMonths, formatDate, startOfMonth } from '@/utils/date';
import { relativeDate } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { isOpen, isOverdue, sortForDay } from '@/utils/taskFilters';

type View_ = 'day' | 'week' | 'month' | 'agenda';

export default function CalendarScreen() {
  const t = useT();
  const language = useLanguage();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useProjectStore((s) => s.projects);
  const weekStartsOn = useSettingsStore((s) => s.settings.weekStartsOn);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);

  const [view, setView] = useState<View_>('week');
  const [selected, setSelected] = useState<DateKey>(today);
  const [month, setMonth] = useState<DateKey>(startOfMonth(today));
  const [rescheduling, setRescheduling] = useState<Task | null>(null);

  const byDay = useMemo(() => {
    const map: Record<DateKey, Task[]> = {};
    for (const task of tasks) {
      if (task.archived || !task.dueDate) continue;
      (map[task.dueDate] ??= []).push(task);
    }
    return map;
  }, [tasks]);

  const counts = useMemo(() => {
    const c: Record<DateKey, number> = {};
    for (const [day, list] of Object.entries(byDay)) c[day] = list.filter(isOpen).length;
    return c;
  }, [byDay]);

  const markers = useMemo(() => {
    const m: Record<DateKey, DayMarker> = {};
    for (const [day, list] of Object.entries(byDay)) {
      const open = list.filter(isOpen);
      if (!open.length) continue;
      m[day] = {
        dots: open.slice(0, 3).map((x) => projects.find((p) => p.id === x.projectId)?.color ?? colors.primary),
        overdue: day < today,
      };
    }
    return m;
  }, [byDay, projects, colors.primary, today]);

  const overdue = useMemo(() => sortForDay(tasks.filter((x) => isOverdue(x, today))), [tasks, today]);
  const dayTasks = sortForDay(byDay[selected] ?? []);

  const select = (day: DateKey) => {
    setSelected(day);
    if (!day.startsWith(month.slice(0, 7))) setMonth(startOfMonth(day));
  };
  const step = (dir: -1 | 1) => {
    haptics.selection();
    if (view === 'day') select(addDays(selected, dir));
    else if (view === 'week') select(addDays(selected, dir * 7));
    else if (view === 'month') {
      const next = addMonths(month, dir);
      setMonth(next);
      setSelected(next.slice(0, 7) === today.slice(0, 7) ? today : next);
    }
  };
  const goToday = () => {
    setSelected(today);
    setMonth(startOfMonth(today));
  };

  const agendaSections = useMemo(() => {
    const sections: { title: string; key: string; danger?: boolean; data: Task[] }[] = [];
    if (overdue.length) sections.push({ title: t('today.overdue'), key: 'overdue', danger: true, data: overdue });
    for (let i = 0; i < 60; i += 1) {
      const day = addDays(today, i);
      const list = (byDay[day] ?? []).filter((x) => isOpen(x) || i === 0);
      if (list.length) {
        sections.push({
          title: `${relativeDate(day, t, language, today)} · ${formatDate(day, language, { day: 'numeric', month: 'short' })}`,
          key: day,
          data: sortForDay(list),
        });
      }
    }
    return sections;
  }, [overdue, byDay, today, t, language]);

  const headerTitle =
    view === 'month'
      ? formatDate(month, language, { month: 'long', year: 'numeric' })
      : view === 'agenda'
        ? t('calendar.agenda')
        : formatDate(selected, language, { month: 'long', year: 'numeric' });

  const renderDayList = (list: Task[], emptyCompact = true) =>
    list.length ? (
      list.map((task) => <TaskItem key={task.id} task={task} today={today} showDate={false} onLongPress={() => setRescheduling(task)} />)
    ) : (
      <EmptyState
        compact={emptyCompact}
        icon={CalendarCheck}
        title={t('calendar.noTasks')}
        message={t('calendar.noTasksHint')}
        actionLabel={t('task.new')}
        onAction={() => openQuickAdd({ dueDate: selected })}
      />
    );

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <AppText variant="title" style={styles.flex} numberOfLines={1} accessibilityRole="header">
          {headerTitle.charAt(0).toUpperCase() + headerTitle.slice(1)}
        </AppText>
        {view !== 'agenda' ? (
          <>
            <IconButton icon={ChevronLeft} flipRTL onPress={() => step(-1)} accessibilityLabel="Previous" variant="filled" size={20} />
            <IconButton icon={ChevronRight} flipRTL onPress={() => step(1)} accessibilityLabel="Next" variant="filled" size={20} />
          </>
        ) : null}
        <IconButton icon={Plus} variant="primary" onPress={() => openQuickAdd({ dueDate: view === 'agenda' ? today : selected })} accessibilityLabel={t('task.new')} />
      </View>
      <View style={styles.controls}>
        <SegmentedControl
          options={[
            { value: 'day', label: t('calendar.day') },
            { value: 'week', label: t('calendar.week') },
            { value: 'month', label: t('calendar.month') },
            { value: 'agenda', label: t('calendar.agenda') },
          ]}
          value={view}
          onChange={setView}
        />
        {selected !== today && view !== 'agenda' ? (
          <Button label={t('calendar.goToday')} onPress={goToday} variant="ghost" size="sm" style={styles.todayBtn} />
        ) : null}
      </View>

      {view === 'day' ? (
        <View style={styles.flex}>
          <View style={styles.padded}>
            <WeekStrip anchor={selected} selected={selected} today={today} weekStartsOn={weekStartsOn} counts={counts} onSelect={select} />
            {dayTasks.filter((x) => !x.startTime).length ? (
              <View style={styles.anytime}>
                <AppText variant="overline" tone="tertiary" style={styles.anytimeLabel}>
                  {t('calendar.allDay').toUpperCase()}
                </AppText>
                {dayTasks
                  .filter((x) => !x.startTime)
                  .slice(0, 3)
                  .map((task) => (
                    <TaskItem key={task.id} task={task} today={today} showDate={false} onLongPress={() => setRescheduling(task)} />
                  ))}
              </View>
            ) : null}
          </View>
          <View style={[styles.flex, { marginBottom: TAB_BAR_SPACE + insets.bottom - spacing.xl }]}>
            <DayTimeline day={selected} today={today} tasks={dayTasks} onCreateAt={(time) => openQuickAdd({ dueDate: selected, startTime: time })} />
          </View>
        </View>
      ) : null}

      {view === 'week' ? (
        <ScrollView contentContainerStyle={[styles.padded, { paddingBottom: TAB_BAR_SPACE + insets.bottom }]} showsVerticalScrollIndicator={false}>
          <WeekStrip anchor={selected} selected={selected} today={today} weekStartsOn={weekStartsOn} counts={counts} onSelect={select} />
          <SectionHeader title={relativeDate(selected, t, language, today)} count={dayTasks.filter(isOpen).length} />
          {renderDayList(dayTasks)}
          {selected === today && overdue.length ? (
            <>
              <SectionHeader title={t('today.overdue')} count={overdue.length} color={colors.danger} />
              {overdue.map((task) => (
                <TaskItem key={task.id} task={task} today={today} onLongPress={() => setRescheduling(task)} />
              ))}
            </>
          ) : null}
        </ScrollView>
      ) : null}

      {view === 'month' ? (
        <ScrollView contentContainerStyle={[styles.padded, { paddingBottom: TAB_BAR_SPACE + insets.bottom }]} showsVerticalScrollIndicator={false}>
          <Card style={styles.monthCard}>
            <MonthGrid month={month} selected={selected} today={today} weekStartsOn={weekStartsOn} onSelect={select} markers={markers} />
          </Card>
          <SectionHeader title={relativeDate(selected, t, language, today)} count={dayTasks.filter(isOpen).length} />
          {renderDayList(dayTasks)}
        </ScrollView>
      ) : null}

      {view === 'agenda' ? (
        <SectionList
          sections={agendaSections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.padded, { paddingBottom: TAB_BAR_SPACE + insets.bottom }]}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} count={section.data.length} color={section.danger ? colors.danger : undefined} />}
          renderItem={({ item }) => <TaskItem task={item} today={today} showDate={false} onLongPress={() => setRescheduling(item)} />}
          ListEmptyComponent={<EmptyState icon={CalendarX2} title={t('calendar.agendaEmpty')} message={t('calendar.noTasksHint')} />}
        />
      ) : null}

      <Sheet visible={!!rescheduling} onClose={() => setRescheduling(null)} title={rescheduling ? `${t('calendar.reschedule')} · ${rescheduling.title}` : ''}>
        <DatePanel
          value={rescheduling?.dueDate ?? null}
          today={today}
          onChange={(d) => {
            if (rescheduling) void updateTask(rescheduling.id, { dueDate: d }).then((ok) => ok && haptics.success());
            setRescheduling(null);
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  controls: { paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.xs },
  todayBtn: { alignSelf: 'flex-end', marginBottom: -spacing.sm },
  padded: { paddingHorizontal: spacing.lg },
  monthCard: { paddingHorizontal: spacing.sm },
  anytime: { marginTop: spacing.md },
  anytimeLabel: { marginBottom: spacing.sm },
});
