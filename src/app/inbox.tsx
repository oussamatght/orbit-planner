import { ArrowUp, CalendarPlus, Inbox } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@/components/tasks/SearchBar';
import { TaskItem } from '@/components/tasks/TaskItem';
import { DatePanel } from '@/components/tasks/panels';
import { EmptyState, IconButton, Screen, Sheet } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { useT } from '@/i18n';
import { createTask, updateTask } from '@/services/taskActions';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { isInbox, searchTasks, sortTasks } from '@/utils/taskFilters';

export default function InboxScreen() {
  const t = useT();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const tasks = useTaskStore((s) => s.tasks);
  const tags = useProjectStore((s) => s.tags);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [scheduling, setScheduling] = useState<string | null>(null);
  const inputRef = useRef<TextInputInstance>(null);

  const inbox = useMemo(() => sortTasks(searchTasks(tasks.filter(isInbox), query, tags), 'manual'), [tasks, query, tags]);

  const capture = async () => {
    if (!draft.trim()) return;
    const created = await createTask({ title: draft }, { silent: true });
    if (created) setDraft('');
    inputRef.current?.focus();
  };

  return (
    <Screen back title={t('inbox.title')} subtitle={t('inbox.subtitle')} large scroll={false}>
      <View style={styles.top}>
        <View style={[styles.capture, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('inbox.quickPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            style={[styles.captureInput, { color: colors.text }]}
            onSubmitEditing={() => void capture()}
            submitBehavior="submit"
            returnKeyType="done"
            maxLength={200}
            accessibilityLabel={t('inbox.quickPlaceholder')}
          />
          <IconButton icon={ArrowUp} variant="primary" onPress={() => void capture()} disabled={!draft.trim()} accessibilityLabel={t('common.add')} size={18} style={styles.send} />
        </View>
        {tasks.filter(isInbox).length > 5 ? <SearchBar value={query} onChange={setQuery} placeholder={t('common.search')} /> : null}
      </View>
      <FlatList
        data={inbox}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            today={today}
            accessory={
              <IconButton icon={CalendarPlus} onPress={() => setScheduling(item.id)} accessibilityLabel={t('task.scheduleConvert')} size={18} color={colors.primaryText} />
            }
          />
        )}
        ListEmptyComponent={<EmptyState icon={Inbox} title={t('inbox.empty')} message={t('inbox.emptyHint')} />}
      />
      <Sheet visible={!!scheduling} onClose={() => setScheduling(null)} title={t('task.scheduleConvert')}>
        <DatePanel
          value={null}
          today={today}
          allowClear={false}
          onChange={(d) => {
            if (scheduling && d) void updateTask(scheduling, { dueDate: d });
            setScheduling(null);
          }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
  capture: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1.5, paddingLeft: spacing.lg, paddingRight: spacing.xs, height: 56 },
  captureInput: { flex: 1, fontFamily: fonts.medium, fontSize: 16, height: '100%' },
  send: { width: 40, height: 40, borderRadius: radius.full },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
});
