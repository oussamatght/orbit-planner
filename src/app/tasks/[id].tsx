import { router, useLocalSearchParams } from 'expo-router';
import {
  Archive,
  Bell,
  CalendarDays,
  CalendarRange,
  Clock,
  Copy,
  Flag,
  Folder,
  Hash,
  Link2,
  Plus,
  Repeat,
  SearchX,
  Shapes,
  Timer,
  Trash2,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { CategoryPanel, DatePanel, PriorityPanel, ProjectPanel, RecurrencePanel, ReminderPanel, TagPanel, TimePanel } from '@/components/tasks/panels';
import { AppText, Button, Card, Checkbox, EmptyState, IconButton, ListRow, Screen, SegmentedControl, Sheet } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { useLanguage, useT } from '@/i18n';
import { archiveCompleted, deleteTasks, duplicateTask, toggleTask, updateTask } from '@/services/taskActions';
import { useFocusStore } from '@/store/focusStore';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore, type TaskPatch } from '@/store/taskStore';
import { toast } from '@/store/uiStore';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { PRIORITY_KEYS, type TaskStatus } from '@/types/models';
import { formatDate, formatTime, isoToDateKey, timeToMinutes } from '@/utils/date';
import { recurrenceLabel, reminderLabel, relativeDate } from '@/utils/format';
import { haptics } from '@/utils/haptics';

type SheetKind = 'due' | 'start' | 'startTime' | 'endTime' | 'priority' | 'project' | 'category' | 'tags' | 'reminders' | 'repeat' | 'dependency' | null;

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const language = useLanguage();
  const today = useToday();
  const { colors } = useTheme();
  const task = useTaskStore((s) => s.tasks.find((x) => x.id === id));
  const allTasks = useTaskStore((s) => s.tasks);
  const { addSubtask, toggleSubtask, removeSubtask } = useTaskStore.getState();
  const projects = useProjectStore((s) => s.projects);
  const categories = useProjectStore((s) => s.categories);
  const tags = useProjectStore((s) => s.tags);
  const setFocusTask = useFocusStore((s) => s.setTask);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [dependencyQuery, setDependencyQuery] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);

  const dependencyCandidates = useMemo(() => {
    if (!task) return [];
    const q = dependencyQuery.trim().toLowerCase();
    return allTasks
      .filter((x) => x.id !== task.id && !x.archived && x.dependsOnId !== task.id && x.status !== 'done')
      .filter((x) => !q || x.title.toLowerCase().includes(q))
      .slice(0, 30);
  }, [allTasks, task, dependencyQuery]);

  if (!task) {
    return (
      <Screen back>
        <EmptyState icon={SearchX} title={t('task.notFound')} actionLabel={t('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }

  const save = (patch: TaskPatch) => void updateTask(task.id, patch);
  const project = projects.find((p) => p.id === task.projectId);
  const category = categories.find((c) => c.id === task.categoryId);
  const dependency = allTasks.find((x) => x.id === task.dependsOnId);
  const done = task.status === 'done';
  const subDone = task.subtasks.filter((s) => s.completed).length;

  const commitTitle = () => {
    const clean = title.trim();
    if (!clean) {
      setTitleError(t('common.required'));
      setTitle(task.title);
      return;
    }
    setTitleError(null);
    if (clean !== task.title) save({ title: clean });
  };

  const setTime = (field: 'startTime' | 'endTime', value: string | null) => {
    const start = field === 'startTime' ? value : task.startTime;
    const end = field === 'endTime' ? value : task.endTime;
    if (start && end && timeToMinutes(end) <= timeToMinutes(start)) {
      haptics.warning();
      toast.error(t('task.endBeforeStart'));
      return;
    }
    save({ [field]: value });
  };

  const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'todo', label: t('status.todo') },
    { value: 'in_progress', label: t('status.in_progress') },
    { value: 'done', label: t('status.done') },
  ];

  return (
    <Screen
      back
      right={
        <>
          <IconButton icon={Copy} onPress={() => void duplicateTask(task.id)} accessibilityLabel={t('common.duplicate')} variant="filled" size={18} />
          <IconButton
            icon={Trash2}
            color={colors.danger}
            onPress={() => void deleteTasks([task.id], { confirm: true }).then((ok) => ok && router.back())}
            accessibilityLabel={t('common.delete')}
            variant="filled"
            size={18}
          />
        </>
      }
    >
      <View style={styles.titleRow}>
        <Checkbox
          checked={done}
          onToggle={() => void toggleTask(task.id)}
          size={28}
          color={colors.priority[PRIORITY_KEYS[task.priority]]}
          accessibilityLabel={done ? t('task.markUndone') : t('task.markDone')}
        />
        <TextInput
          value={title}
          onChangeText={setTitle}
          onBlur={commitTitle}
          onSubmitEditing={commitTitle}
          multiline
          submitBehavior="blurAndSubmit"
          maxLength={200}
          placeholder={t('task.titlePlaceholder')}
          placeholderTextColor={colors.textTertiary}
          style={[styles.title, { color: done ? colors.textTertiary : colors.text }, done && styles.strike]}
          accessibilityLabel={t('task.title')}
        />
      </View>
      {titleError ? (
        <AppText variant="caption" tone="danger" style={styles.error}>
          {titleError}
        </AppText>
      ) : null}
      <TextInput
        value={description}
        onChangeText={setDescription}
        onBlur={() => description !== task.description && save({ description })}
        multiline
        maxLength={2000}
        placeholder={t('task.descriptionPlaceholder')}
        placeholderTextColor={colors.textTertiary}
        style={[styles.description, { color: colors.textSecondary }]}
        accessibilityLabel={t('common.description')}
      />

      <View style={styles.segment}>
        <SegmentedControl options={statusOptions} value={task.status} onChange={(status) => save({ status })} />
      </View>

      <Card style={styles.card} padded={false}>
        <View style={styles.cardInner}>
          <ListRow
            icon={CalendarDays}
            title={t('task.dueDate')}
            value={task.dueDate ? relativeDate(task.dueDate, t, language, today) : t('common.noDate')}
            iconColor={task.dueDate && task.dueDate < today && !done ? colors.danger : colors.primary}
            onPress={() => setSheet('due')}
          />
          <ListRow icon={CalendarRange} title={t('task.startDate')} value={task.startDate ? relativeDate(task.startDate, t, language, today) : t('common.none')} iconColor="#0EA5E9" onPress={() => setSheet('start')} />
          <ListRow icon={Clock} title={t('task.startTime')} value={task.startTime ? formatTime(task.startTime, language) : t('picker.noTime')} iconColor="#14B8A6" onPress={() => setSheet('startTime')} />
          <ListRow icon={Clock} title={t('task.endTime')} value={task.endTime ? formatTime(task.endTime, language) : t('picker.noTime')} iconColor="#14B8A6" onPress={() => setSheet('endTime')} last />
        </View>
      </Card>

      <Card style={styles.card} padded={false}>
        <View style={styles.cardInner}>
          <ListRow icon={Flag} title={t('task.priority')} value={t(`priority.${PRIORITY_KEYS[task.priority]}`)} iconColor={colors.priority[PRIORITY_KEYS[task.priority]]} onPress={() => setSheet('priority')} />
          <ListRow icon={Folder} title={t('task.project')} value={project?.name ?? t('task.inbox')} iconColor={project?.color ?? colors.textSecondary} onPress={() => setSheet('project')} />
          <ListRow icon={Shapes} title={t('task.category')} value={category?.name ?? t('common.none')} iconColor={category?.color ?? '#8B5CF6'} onPress={() => setSheet('category')} />
          <ListRow
            icon={Hash}
            title={t('task.tags')}
            value={task.tagIds.map((tid) => tags.find((x) => x.id === tid)?.name).filter(Boolean).map((n) => `#${n}`).join(' ') || t('common.none')}
            iconColor="#EC4899"
            onPress={() => setSheet('tags')}
            last
          />
        </View>
      </Card>

      <Card style={styles.card} padded={false}>
        <View style={styles.cardInner}>
          <ListRow
            icon={Bell}
            title={t('task.reminders')}
            value={task.reminders.length === 0 ? t('common.none') : task.reminders.length === 1 ? reminderLabel(task.reminders[0].offsetMinutes, t) : String(task.reminders.length)}
            iconColor="#F5A524"
            onPress={() => setSheet('reminders')}
          />
          <ListRow icon={Repeat} title={t('task.repeat')} value={recurrenceLabel(task.recurrence, t, language)} iconColor="#8B5CF6" onPress={() => setSheet('repeat')} />
          <ListRow icon={Link2} title={t('task.dependsOn')} value={dependency?.title ?? t('common.none')} iconColor="#64748B" onPress={() => setSheet('dependency')} last />
        </View>
      </Card>

      <View style={styles.sectionHead}>
        <AppText variant="subheading">{t('task.subtasks')}</AppText>
        {task.subtasks.length ? (
          <AppText variant="label" tone="tertiary">
            {t('task.subtaskProgress', { done: subDone, total: task.subtasks.length })}
          </AppText>
        ) : null}
      </View>
      <Card style={styles.card}>
        {task.subtasks.map((s) => (
          <View key={s.id} style={styles.subtask}>
            <Checkbox checked={s.completed} onToggle={() => { haptics.light(); void toggleSubtask(task.id, s.id); }} size={20} rounded={false} accessibilityLabel={s.title} />
            <AppText variant="body" style={[styles.flex, s.completed && styles.strike]} color={s.completed ? colors.textTertiary : colors.text}>
              {s.title}
            </AppText>
            <IconButton icon={X} onPress={() => void removeSubtask(task.id, s.id)} accessibilityLabel={t('common.delete')} size={16} color={colors.textTertiary} />
          </View>
        ))}
        <View style={styles.subtask}>
          <Plus size={20} color={colors.primary} />
          <TextInput
            value={subtaskDraft}
            onChangeText={setSubtaskDraft}
            placeholder={t('task.addSubtask')}
            placeholderTextColor={colors.textTertiary}
            style={[styles.subtaskInput, { color: colors.text }]}
            maxLength={200}
            returnKeyType="done"
            submitBehavior="submit"
            onSubmitEditing={() => {
              if (!subtaskDraft.trim()) return;
              void addSubtask(task.id, subtaskDraft);
              setSubtaskDraft('');
            }}
            accessibilityLabel={t('task.addSubtask')}
          />
        </View>
      </Card>

      <View style={styles.sectionHead}>
        <AppText variant="subheading">{t('task.notes')}</AppText>
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        onBlur={() => notes !== task.notes && save({ notes })}
        multiline
        maxLength={10000}
        placeholder={t('task.notesPlaceholder')}
        placeholderTextColor={colors.textTertiary}
        style={[styles.notes, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityLabel={t('task.notes')}
      />

      <View style={styles.actions}>
        <Button
          label={t('task.startFocus')}
          icon={Timer}
          variant="soft"
          onPress={() => {
            setFocusTask(task.id);
            router.push('/focus');
          }}
          fullWidth
        />
        {done && !task.archived ? <Button label={t('common.archive')} icon={Archive} variant="secondary" onPress={() => void archiveCompleted([task.id])} fullWidth /> : null}
        {task.archived ? <Button label={t('common.unarchive')} icon={Archive} variant="secondary" onPress={() => save({ archived: false })} fullWidth /> : null}
      </View>

      <AppText variant="caption" tone="tertiary" align="center" style={styles.meta}>
        {t('task.createdOn', { date: formatDate(isoToDateKey(task.createdAt), language, { day: 'numeric', month: 'long', year: 'numeric' }) })}
        {task.completedAt ? ` · ${t('task.completedOn', { date: formatDate(isoToDateKey(task.completedAt), language, { day: 'numeric', month: 'long' }) })}` : ''}
      </AppText>

      <Sheet visible={sheet === 'due'} onClose={() => setSheet(null)} title={t('task.dueDate')}>
        <DatePanel value={task.dueDate} today={today} onChange={(d) => { save({ dueDate: d }); setSheet(null); }} />
      </Sheet>
      <Sheet visible={sheet === 'start'} onClose={() => setSheet(null)} title={t('task.startDate')}>
        <DatePanel value={task.startDate} today={today} onChange={(d) => { save({ startDate: d }); setSheet(null); }} />
      </Sheet>
      <Sheet visible={sheet === 'startTime'} onClose={() => setSheet(null)} title={t('task.startTime')}>
        <TimePanel value={task.startTime} onChange={(v) => setTime('startTime', v)} />
      </Sheet>
      <Sheet visible={sheet === 'endTime'} onClose={() => setSheet(null)} title={t('task.endTime')}>
        <TimePanel value={task.endTime} onChange={(v) => setTime('endTime', v)} />
      </Sheet>
      <Sheet visible={sheet === 'priority'} onClose={() => setSheet(null)} title={t('task.priority')}>
        <PriorityPanel value={task.priority} onChange={(p) => { save({ priority: p }); setSheet(null); }} />
      </Sheet>
      <Sheet visible={sheet === 'project'} onClose={() => setSheet(null)} title={t('picker.project')}>
        <ProjectPanel value={task.projectId} onChange={(pid) => { save({ projectId: pid }); setSheet(null); }} />
      </Sheet>
      <Sheet visible={sheet === 'category'} onClose={() => setSheet(null)} title={t('picker.category')}>
        <CategoryPanel value={task.categoryId} onChange={(cid) => save({ categoryId: cid })} />
      </Sheet>
      <Sheet visible={sheet === 'tags'} onClose={() => setSheet(null)} title={t('picker.tags')}>
        <TagPanel value={task.tagIds} onChange={(ids) => save({ tagIds: ids })} />
      </Sheet>
      <Sheet visible={sheet === 'reminders'} onClose={() => setSheet(null)} title={t('task.reminders')}>
        <ReminderPanel value={task.reminders.map((r) => r.offsetMinutes)} onChange={(offsets) => save({ reminderOffsets: offsets })} hasDate={!!task.dueDate} />
      </Sheet>
      <Sheet visible={sheet === 'repeat'} onClose={() => setSheet(null)} title={t('task.repeat')}>
        <RecurrencePanel value={task.recurrence} onChange={(r) => save({ recurrence: r })} />
      </Sheet>
      <Sheet visible={sheet === 'dependency'} onClose={() => setSheet(null)} title={t('picker.dependency')}>
        <TextInput
          value={dependencyQuery}
          onChangeText={setDependencyQuery}
          placeholder={t('picker.searchTasks')}
          placeholderTextColor={colors.textTertiary}
          style={[styles.search, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
          accessibilityLabel={t('picker.searchTasks')}
        />
        <ListRow title={t('common.none')} onPress={() => { save({ dependsOnId: null }); setSheet(null); }} />
        {dependencyCandidates.map((c, i) => (
          <ListRow
            key={c.id}
            title={c.title}
            subtitle={c.dueDate ? relativeDate(c.dueDate, t, language, today) : undefined}
            onPress={() => { save({ dependsOnId: c.id }); setSheet(null); }}
            last={i === dependencyCandidates.length - 1}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginTop: spacing.sm },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, paddingTop: 0, paddingBottom: 0 },
  strike: { textDecorationLine: 'line-through' },
  error: { marginLeft: 40, marginTop: spacing.xs },
  description: { fontFamily: fonts.regular, fontSize: 15, marginLeft: 40, marginTop: spacing.xs, paddingVertical: spacing.xs },
  segment: { marginTop: spacing.lg },
  card: { marginTop: spacing.md },
  cardInner: { paddingHorizontal: spacing.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xs },
  subtask: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 40 },
  subtaskInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, paddingVertical: spacing.sm },
  notes: { minHeight: 120, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, fontFamily: fonts.regular, fontSize: 15, textAlignVertical: 'top', marginTop: spacing.sm },
  actions: { marginTop: spacing.xxl, gap: spacing.sm },
  meta: { marginTop: spacing.xl },
  search: { height: 44, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontFamily: fonts.medium, marginBottom: spacing.sm },
});
