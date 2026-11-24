import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { useLanguage } from '@/i18n';
import { toggleTask } from '@/services/taskActions';
import { useProjectStore } from '@/store/projectStore';
import { radius, spacing, useTheme, withAlpha } from '@/theme';
import { PRIORITY_KEYS, type DateKey, type Task } from '@/types/models';
import { formatTime, minutesToTime, timeToMinutes } from '@/utils/date';

import { AppText } from '../ui/AppText';
import { Checkbox } from '../ui/Checkbox';

const HOUR_HEIGHT = 64;

interface Props {
  day: DateKey;
  today: DateKey;
  tasks: Task[];
  onCreateAt: (time: string) => void;
}

/** Hour-by-hour timeline for timed tasks of a single day, with a live "now" line. */
export function DayTimeline({ day, today, tasks, onCreateAt }: Props) {
  const { colors } = useTheme();
  const language = useLanguage();
  const projects = useProjectStore((s) => s.projects);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const timed = tasks.filter((x) => x.startTime);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    const first = timed.length ? Math.min(...timed.map((x) => timeToMinutes(x.startTime as string))) : day === today ? nowMinutes : 8 * 60;
    const y = Math.max(0, (first / 60 - 1) * HOUR_HEIGHT);
    const timer = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  // Lay out overlapping events side by side.
  const sorted = [...timed].sort((a, b) => timeToMinutes(a.startTime as string) - timeToMinutes(b.startTime as string));
  const columns: { task: Task; start: number; end: number; col: number }[] = [];
  for (const task of sorted) {
    const start = timeToMinutes(task.startTime as string);
    const end = task.endTime ? Math.max(start + 20, timeToMinutes(task.endTime)) : start + 45;
    let col = 0;
    while (columns.some((c) => c.col === col && c.start < end && start < c.end)) col += 1;
    columns.push({ task, start, end, col });
  }
  const maxCol = columns.reduce((m, c) => Math.max(m, c.col), 0) + 1;

  return (
    <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={{ height: HOUR_HEIGHT * 24 + spacing.huge }} showsVerticalScrollIndicator={false}>
      {Array.from({ length: 24 }, (_, h) => (
        <Pressable
          key={h}
          onPress={() => onCreateAt(minutesToTime(h * 60))}
          style={[styles.hour, { top: h * HOUR_HEIGHT, borderTopColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={`Add task at ${h}:00`}
        >
          <AppText variant="caption" tone="tertiary" style={styles.hourLabel}>
            {formatTime(minutesToTime(h * 60), language)}
          </AppText>
        </Pressable>
      ))}
      {day === today ? (
        <View style={[styles.now, { top: (nowMinutes / 60) * HOUR_HEIGHT }]} pointerEvents="none">
          <View style={[styles.nowDot, { backgroundColor: colors.danger }]} />
          <View style={[styles.nowLine, { backgroundColor: colors.danger }]} />
        </View>
      ) : null}
      <View style={styles.events} pointerEvents="box-none">
        {columns.map(({ task, start, end, col }) => {
          const project = projects.find((p) => p.id === task.projectId);
          const accent = project?.color ?? colors.priority[PRIORITY_KEYS[task.priority]];
          const done = task.status === 'done';
          const height = Math.max(36, ((end - start) / 60) * HOUR_HEIGHT - 3);
          return (
            <Pressable
              key={task.id}
              onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
              style={[
                styles.event,
                {
                  top: (start / 60) * HOUR_HEIGHT + 1,
                  height,
                  left: `${(col / maxCol) * 100}%`,
                  width: `${100 / maxCol}%`,
                  backgroundColor: withAlpha(accent, done ? 0.08 : 0.16),
                  borderLeftColor: accent,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${task.title}, ${task.startTime}`}
            >
              <View style={styles.eventRow}>
                <Checkbox checked={done} onToggle={() => void toggleTask(task.id)} size={18} color={accent} accessibilityLabel={task.title} />
                <View style={styles.flex}>
                  <AppText variant="label" numberOfLines={height > 50 ? 2 : 1} color={done ? colors.textTertiary : colors.text} style={done ? styles.strike : undefined}>
                    {task.title}
                  </AppText>
                  {height > 50 ? (
                    <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                      {formatTime(task.startTime as string, language)}
                      {task.endTime ? ` – ${formatTime(task.endTime, language)}` : ''}
                    </AppText>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      {timed.length === 0 ? (
        <View style={[styles.hint, { top: 9 * HOUR_HEIGHT + 8 }]} pointerEvents="none">
          <Plus size={14} color={colors.textTertiary} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hour: { position: 'absolute', left: 0, right: 0, height: HOUR_HEIGHT, borderTopWidth: StyleSheet.hairlineWidth },
  hourLabel: { width: 56, marginTop: -8, paddingLeft: spacing.xs, backgroundColor: 'transparent' },
  now: { position: 'absolute', left: 50, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 5 },
  nowDot: { width: 9, height: 9, borderRadius: 5, marginLeft: -4 },
  nowLine: { flex: 1, height: 2 },
  events: { position: 'absolute', top: 0, bottom: 0, left: 60, right: spacing.xs },
  event: { position: 'absolute', borderRadius: radius.sm, borderLeftWidth: 3, paddingHorizontal: spacing.sm, paddingVertical: 6, overflow: 'hidden' },
  eventRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  strike: { textDecorationLine: 'line-through' },
  hint: { position: 'absolute', left: 64 },
});
