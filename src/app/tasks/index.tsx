import { useLocalSearchParams } from 'expo-router';
import { Archive, ArrowDownUp, CalendarDays, CheckCheck, ChevronDown, ChevronUp, Flag, Folder, ListTodo, Plus, Trash2, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@/components/tasks/SearchBar';
import { TaskItem } from '@/components/tasks/TaskItem';
import { DatePanel, PriorityPanel, ProjectPanel } from '@/components/tasks/panels';
import { AppText, Chip, EmptyState, IconButton, ListRow, Screen, Sheet } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { useT, type TranslationKey } from '@/i18n';
import { archiveCompleted, bulkComplete, bulkUpdate, deleteTasks } from '@/services/taskActions';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { radius, shadow, spacing, useTheme } from '@/theme';
import { filterTasks, searchTasks, sortTasks, TASK_FILTERS, TASK_SORTS, type TaskFilter, type TaskSort } from '@/utils/taskFilters';

const FILTER_LABELS: Record<TaskFilter, TranslationKey> = {
  all: 'filter.all',
  today: 'filter.today',
  upcoming: 'filter.upcoming',
  overdue: 'filter.overdue',
  completed: 'filter.completed',
  high: 'filter.high',
  unscheduled: 'filter.unscheduled',
  archived: 'filter.archived',
};
const SORT_LABELS: Record<TaskSort, TranslationKey> = {
  manual: 'sort.manual',
  dueDate: 'sort.dueDate',
  priority: 'sort.priority',
  created: 'sort.created',
  alpha: 'sort.alpha',
};

type BulkSheet = 'priority' | 'move' | 'date' | 'sort' | null;

export default function MyTasksScreen() {
  const params = useLocalSearchParams<{ filter?: string; search?: string }>();
  const t = useT();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const { colors, dark } = useTheme();
  const tasks = useTaskStore((s) => s.tasks);
  const moveTask = useTaskStore((s) => s.moveTask);
  const tags = useProjectStore((s) => s.tags);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);

  const initialFilter = TASK_FILTERS.includes(params.filter as TaskFilter) ? (params.filter as TaskFilter) : 'all';
  const [filter, setFilter] = useState<TaskFilter>(initialFilter);
  const [sort, setSort] = useState<TaskSort>(initialFilter === 'upcoming' ? 'dueDate' : 'manual');
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<string[]>([]);
  const [sheet, setSheet] = useState<BulkSheet>(null);
  const selecting = selection.length > 0;

  const visible = useMemo(() => {
    const base = query ? tasks.filter((x) => (filter === 'archived' ? x.archived : !x.archived)) : filterTasks(tasks, filter, today);
    return sortTasks(searchTasks(base, query, tags), sort);
  }, [tasks, filter, sort, query, tags, today]);
  const visibleIds = visible.map((x) => x.id);
  const canReorder = sort === 'manual' && !query && !selecting;

  const toggleSelect = (id: string) => setSelection((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const clearSelection = () => setSelection([]);
  const completedCount = visible.filter((x) => x.status === 'done' && !x.archived).length;

  return (
    <Screen
      back
      title={selecting ? t('common.selected', { count: selection.length }) : t('myTasks.title')}
      large={!selecting}
      scroll={false}
      right={
        selecting ? (
          <IconButton icon={X} onPress={clearSelection} accessibilityLabel={t('common.cancel')} variant="filled" />
        ) : (
          <>
            <IconButton icon={ArrowDownUp} onPress={() => setSheet('sort')} accessibilityLabel={t('sort.title')} variant="filled" size={18} />
            <IconButton icon={Plus} onPress={() => openQuickAdd()} accessibilityLabel={t('task.new')} variant="primary" />
          </>
        )
      }
    >
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChange={setQuery} placeholder={t('myTasks.searchPlaceholder')} autoFocus={params.search === '1'} />
      </View>
      {!query ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filterScroll}>
          {TASK_FILTERS.map((f) => (
            <Chip
              key={f}
              label={t(FILTER_LABELS[f])}
              selected={filter === f}
              color={f === 'overdue' ? colors.danger : undefined}
              onPress={() => {
                setFilter(f);
                clearSelection();
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.metaRow}>
        <AppText variant="label" tone="tertiary">
          {t('calendar.tasksCount', { count: visible.length })} · {t(SORT_LABELS[sort])}
        </AppText>
        {filter === 'completed' && completedCount > 0 && !selecting ? (
          <Chip size="sm" icon={Archive} label={t('myTasks.archiveCompleted')} onPress={() => void archiveCompleted(visibleIds)} />
        ) : null}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (selecting ? 120 : spacing.xxxl) }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item, index }) => (
          <TaskItem
            task={item}
            today={today}
            selectionMode={selecting}
            selected={selection.includes(item.id)}
            onSelect={toggleSelect}
            onLongPress={toggleSelect}
            accessory={
              canReorder && item.status !== 'done' ? (
                <View style={styles.reorder}>
                  <IconButton icon={ChevronUp} size={16} disabled={index === 0} onPress={() => void moveTask(item.id, -1, visibleIds)} accessibilityLabel={t('reorder.moveUp')} style={styles.reorderBtn} color={colors.textTertiary} />
                  <IconButton icon={ChevronDown} size={16} disabled={index === visible.length - 1 || visible[index + 1]?.status === 'done'} onPress={() => void moveTask(item.id, 1, visibleIds)} accessibilityLabel={t('reorder.moveDown')} style={styles.reorderBtn} color={colors.textTertiary} />
                </View>
              ) : undefined
            }
          />
        )}
        ListEmptyComponent={<EmptyState icon={ListTodo} title={t('myTasks.empty')} message={t('myTasks.emptyHint')} actionLabel={t('task.new')} onAction={() => openQuickAdd()} />}
      />

      {selecting ? (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(150)}
          style={[styles.bulkBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, bottom: insets.bottom + spacing.lg }, !dark && shadow(3)]}
        >
          <BulkAction icon={CheckCheck} label={t('bulk.complete')} onPress={() => void bulkComplete(selection).then(clearSelection)} />
          <BulkAction icon={Flag} label={t('bulk.priority')} onPress={() => setSheet('priority')} />
          <BulkAction icon={Folder} label={t('bulk.move')} onPress={() => setSheet('move')} />
          <BulkAction icon={CalendarDays} label={t('bulk.reschedule')} onPress={() => setSheet('date')} />
          <BulkAction icon={Trash2} label={t('common.delete')} color={colors.danger} onPress={() => void deleteTasks(selection, { confirm: true }).then((ok) => ok && clearSelection())} />
        </Animated.View>
      ) : null}

      <Sheet visible={sheet === 'sort'} onClose={() => setSheet(null)} title={t('sort.title')}>
        {TASK_SORTS.map((s, i) => (
          <ListRow
            key={s}
            title={t(SORT_LABELS[s])}
            value={sort === s ? '✓' : undefined}
            onPress={() => {
              setSort(s);
              setSheet(null);
            }}
            last={i === TASK_SORTS.length - 1}
          />
        ))}
      </Sheet>
      <Sheet visible={sheet === 'priority'} onClose={() => setSheet(null)} title={t('bulk.priority')}>
        <PriorityPanel value={1} onChange={(p) => { void bulkUpdate(selection, { priority: p }).then(clearSelection); setSheet(null); }} />
      </Sheet>
      <Sheet visible={sheet === 'move'} onClose={() => setSheet(null)} title={t('picker.project')}>
        <ProjectPanel value={null} onChange={(pid) => { void bulkUpdate(selection, { projectId: pid }).then(clearSelection); setSheet(null); }} />
      </Sheet>
      <Sheet visible={sheet === 'date'} onClose={() => setSheet(null)} title={t('picker.date')}>
        <DatePanel value={null} today={today} onChange={(d) => { void bulkUpdate(selection, { dueDate: d }).then(clearSelection); setSheet(null); }} />
      </Sheet>
    </Screen>
  );
}

function BulkAction({ icon: Icon, label, onPress, color }: { icon: typeof Flag; label: string; onPress: () => void; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bulkItem}>
      <IconButton icon={Icon} onPress={onPress} accessibilityLabel={label} color={color ?? colors.text} />
      <AppText variant="caption" color={color ?? colors.textSecondary} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg },
  filterScroll: { flexGrow: 0 },
  filters: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.sm, minHeight: 28 },
  list: { paddingHorizontal: spacing.lg },
  reorder: { marginRight: -spacing.sm, marginVertical: -spacing.sm },
  reorderBtn: { width: 32, height: 28 },
  bulkBar: { position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row', borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  bulkItem: { flex: 1, alignItems: 'center' },
});
