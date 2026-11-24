import { Link2, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useToday } from '@/hooks/useToday';
import { useLanguage, useT } from '@/i18n';
import { useFocusStore } from '@/store/focusStore';
import { useTaskStore } from '@/store/taskStore';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { relativeDate } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { isOpen } from '@/utils/taskFilters';

import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { IconButton } from '../ui/IconButton';
import { ListRow } from '../ui/ListRow';
import { Sheet } from '../ui/Sheet';

/** Shows the task the session is linked to, with a searchable picker to change it. */
export function FocusTaskCard() {
  const t = useT();
  const language = useLanguage();
  const today = useToday();
  const { colors } = useTheme();
  const taskId = useFocusStore((s) => s.taskId);
  const setTask = useFocusStore((s) => s.setTask);
  const tasks = useTaskStore((s) => s.tasks);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const linked = tasks.find((x) => x.id === taskId);
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter(isOpen).filter((x) => !q || x.title.toLowerCase().includes(q)).slice(0, 40);
  }, [tasks, query]);

  return (
    <>
      <Card onPress={() => setOpen(true)} style={styles.card} accessibilityLabel={t('focus.linkTask')}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <Link2 size={18} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <AppText variant="caption" tone="tertiary">
              {linked ? t('focus.linkedTask') : t('focus.linkTask')}
            </AppText>
            <AppText variant="bodyMedium" numberOfLines={1}>
              {linked?.title ?? t('focus.noTask')}
            </AppText>
          </View>
          {linked ? <IconButton icon={X} onPress={() => setTask(null)} accessibilityLabel={t('common.clear')} size={16} /> : null}
        </View>
      </Card>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('picker.task')}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('picker.searchTasks')}
          placeholderTextColor={colors.textTertiary}
          style={[styles.search, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
          accessibilityLabel={t('picker.searchTasks')}
        />
        {candidates.length === 0 ? (
          <AppText variant="label" tone="tertiary" style={styles.empty}>
            {t('myTasks.empty')}
          </AppText>
        ) : (
          candidates.map((task, i) => (
            <ListRow
              key={task.id}
              title={task.title}
              subtitle={task.dueDate ? relativeDate(task.dueDate, t, language, today) : undefined}
              value={task.id === taskId ? '✓' : undefined}
              onPress={() => {
                setTask(task.id);
                haptics.selection();
                setOpen(false);
              }}
              last={i === candidates.length - 1}
            />
          ))
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { marginTop: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  search: { height: 44, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontFamily: fonts.medium, marginBottom: spacing.sm },
  empty: { paddingVertical: spacing.lg, textAlign: 'center' },
});
