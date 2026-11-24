import { router } from 'expo-router';
import { Bell, CalendarDays, Check, CircleCheck, Clock, Link2, ListChecks, Repeat, Trash2 } from 'lucide-react-native';
import { memo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeOut, LinearTransition, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useLanguage, useT } from '@/i18n';
import { toggleTask, deleteTasks } from '@/services/taskActions';
import { useProjectStore } from '@/store/projectStore';
import { radius, spacing, useTheme, withAlpha } from '@/theme';
import { PRIORITY_KEYS, type DateKey, type Task } from '@/types/models';
import { formatTime } from '@/utils/date';
import { relativeDate } from '@/utils/format';
import { haptics } from '@/utils/haptics';

import { AppText } from '../ui/AppText';
import { Checkbox } from '../ui/Checkbox';
import { PressableScale } from '../ui/PressableScale';

interface Props {
  task: Task;
  today: DateKey;
  showProject?: boolean;
  showDate?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onLongPress?: (id: string) => void;
  swipeEnabled?: boolean;
  /** Rendered at the end of the row (e.g. reorder buttons). */
  accessory?: React.ReactNode;
}

function SwipeAction({ progress, color, icon: Icon, align }: { progress: SharedValue<number>; color: string; icon: typeof Check; align: 'left' | 'right' }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1], 'clamp') }],
  }));
  return (
    <View style={[styles.action, { backgroundColor: color, alignItems: align === 'left' ? 'flex-start' : 'flex-end' }]}>
      <Animated.View style={[styles.actionIcon, style]}>
        <Icon size={22} color="#FFFFFF" strokeWidth={2.4} />
      </Animated.View>
    </View>
  );
}

export const TaskItem = memo(function TaskItem({
  task,
  today,
  showProject = true,
  showDate = true,
  selectionMode,
  selected,
  onSelect,
  onLongPress,
  swipeEnabled = true,
  accessory,
}: Props) {
  const { colors } = useTheme();
  const t = useT();
  const language = useLanguage();
  const project = useProjectStore((s) => (task.projectId ? s.projects.find((p) => p.id === task.projectId) : undefined));
  const tags = useProjectStore((s) => s.tags);
  const swipeRef = useRef<SwipeableMethods>(null);

  const done = task.status === 'done';
  const overdue = !done && !!task.dueDate && task.dueDate < today;
  const priorityColor = colors.priority[PRIORITY_KEYS[task.priority]];
  const subDone = task.subtasks.filter((s) => s.completed).length;
  const taskTags = task.tagIds.map((id) => tags.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);

  const open = () => {
    if (selectionMode) onSelect?.(task.id);
    else router.push({ pathname: '/tasks/[id]', params: { id: task.id } });
  };

  const meta: React.ReactNode[] = [];
  if (showDate && task.dueDate) {
    meta.push(
      <View key="date" style={styles.metaItem}>
        <CalendarDays size={12} color={overdue ? colors.danger : colors.textTertiary} />
        <AppText variant="caption" color={overdue ? colors.danger : colors.textTertiary}>
          {relativeDate(task.dueDate, t, language, today)}
        </AppText>
      </View>,
    );
  }
  if (task.startTime) {
    meta.push(
      <View key="time" style={styles.metaItem}>
        <Clock size={12} color={colors.textTertiary} />
        <AppText variant="caption" tone="tertiary">
          {formatTime(task.startTime, language)}
          {task.endTime ? ` – ${formatTime(task.endTime, language)}` : ''}
        </AppText>
      </View>,
    );
  }
  if (showProject && project) {
    meta.push(
      <View key="project" style={styles.metaItem}>
        <View style={[styles.projectDot, { backgroundColor: project.color }]} />
        <AppText variant="caption" tone="tertiary" numberOfLines={1}>
          {project.name}
        </AppText>
      </View>,
    );
  }
  if (task.subtasks.length) {
    meta.push(
      <View key="sub" style={styles.metaItem}>
        <ListChecks size={12} color={colors.textTertiary} />
        <AppText variant="caption" tone="tertiary">
          {t('task.subtaskProgress', { done: subDone, total: task.subtasks.length })}
        </AppText>
      </View>,
    );
  }
  if (task.recurrence) meta.push(<Repeat key="rep" size={12} color={colors.textTertiary} />);
  if (task.reminders.length && task.dueDate) meta.push(<Bell key="rem" size={12} color={colors.textTertiary} />);
  if (task.dependsOnId) meta.push(<Link2 key="dep" size={12} color={colors.textTertiary} />);

  const row = (
    <PressableScale
      onPress={open}
      onLongPress={() => {
        haptics.medium();
        onLongPress?.(task.id);
      }}
      delayLongPress={350}
      pressedScale={0.985}
      accessibilityLabel={`${task.title}${done ? ', done' : ''}${overdue ? ', overdue' : ''}`}
      accessibilityHint="Opens task details"
      style={[
        styles.row,
        { backgroundColor: selected ? colors.primarySoft : colors.surface, borderColor: selected ? colors.primary : colors.border },
      ]}
    >
      <View style={[styles.priorityBar, { backgroundColor: task.priority >= 2 && !done ? priorityColor : 'transparent' }]} />
      {selectionMode ? (
        <View
          style={[
            styles.selectCircle,
            { borderColor: selected ? colors.primary : colors.borderStrong, backgroundColor: selected ? colors.primary : 'transparent' },
          ]}
        >
          {selected ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>
      ) : (
        <Checkbox
          checked={done}
          onToggle={() => void toggleTask(task.id)}
          color={task.priority >= 2 ? priorityColor : colors.primary}
          accessibilityLabel={done ? t('task.markUndone') : t('task.markDone')}
        />
      )}
      <View style={styles.body}>
        <AppText
          variant="bodyMedium"
          numberOfLines={2}
          color={done ? colors.textTertiary : colors.text}
          style={done ? styles.strike : undefined}
        >
          {task.title}
        </AppText>
        {meta.length ? <View style={styles.meta}>{meta}</View> : null}
        {taskTags.length ? (
          <View style={styles.tags}>
            {taskTags.slice(0, 3).map((tag) => (
              <View key={tag.id} style={[styles.tag, { backgroundColor: withAlpha(tag.color, 0.14) }]}>
                <AppText variant="caption" color={tag.color}>
                  #{tag.name}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {accessory}
    </PressableScale>
  );

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} layout={LinearTransition.springify().damping(20)} style={styles.wrap}>
      {swipeEnabled && !selectionMode ? (
        <ReanimatedSwipeable
          ref={swipeRef}
          friction={1.6}
          leftThreshold={70}
          rightThreshold={70}
          overshootLeft={false}
          overshootRight={false}
          renderLeftActions={(progress) => <SwipeAction progress={progress} color={colors.success} icon={CircleCheck} align="left" />}
          renderRightActions={(progress) => <SwipeAction progress={progress} color={colors.danger} icon={Trash2} align="right" />}
          onSwipeableWillOpen={(direction) => {
            swipeRef.current?.close();
            if (direction === 'left') void deleteTasks([task.id], { confirm: false });
            else void toggleTask(task.id);
          }}
          containerStyle={styles.swipeContainer}
        >
          {row}
        </ReanimatedSwipeable>
      ) : (
        row
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  swipeContainer: { borderRadius: radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingRight: spacing.lg,
    paddingLeft: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
    overflow: 'hidden',
  },
  priorityBar: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  selectCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4, paddingTop: 1 },
  strike: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.md, rowGap: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 160 },
  projectDot: { width: 7, height: 7, borderRadius: 4 },
  tags: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: radius.xs },
  action: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, borderRadius: radius.lg },
  actionIcon: { width: 28, alignItems: 'center' },
});
