import { router, useLocalSearchParams } from 'expo-router';
import { Archive, ArchiveRestore, ListTodo, Pencil, Plus, SearchX, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';

import { TaskItem } from '@/components/tasks/TaskItem';
import { AppText, Button, Card, Chip, EmptyState, IconButton, ProgressRing, Screen, SectionHeader } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { useLanguage, useT } from '@/i18n';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { toast, useUiStore } from '@/store/uiStore';
import { radius, spacing, useTheme, withAlpha } from '@/theme';
import { formatDate, isoToDateKey } from '@/utils/date';
import { haptics } from '@/utils/haptics';
import { isDone, projectProgress, sortTasks } from '@/utils/taskFilters';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const language = useLanguage();
  const today = useToday();
  const { colors } = useTheme();
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const { updateProject, deleteProject } = useProjectStore.getState();
  const tasks = useTaskStore((s) => s.tasks);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const [showDone, setShowDone] = useState(false);

  const list = useMemo(() => tasks.filter((x) => x.projectId === id && !x.archived), [tasks, id]);
  const open = sortTasks(list.filter((x) => !isDone(x)), 'dueDate');
  const done = sortTasks(list.filter(isDone), 'created');

  if (!project) {
    return (
      <Screen back>
        <EmptyState icon={SearchX} title={t('projects.empty')} actionLabel={t('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }

  const { percent, total } = projectProgress(tasks, project.id);

  const confirmDelete = () =>
    Alert.alert(t('projects.deleteConfirm'), t('projects.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProject(project.id);
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
          <IconButton icon={Pencil} onPress={() => router.push({ pathname: '/projects/edit', params: { id: project.id } })} accessibilityLabel={t('common.edit')} variant="filled" size={18} />
          <IconButton icon={Trash2} onPress={confirmDelete} accessibilityLabel={t('common.delete')} variant="filled" size={18} color={colors.danger} />
        </>
      }
    >
      <Card style={[styles.hero, { backgroundColor: withAlpha(project.color, 0.1), borderColor: withAlpha(project.color, 0.25) }]}>
        <View style={styles.heroRow}>
          <View style={styles.flex}>
            <View style={[styles.icon, { backgroundColor: withAlpha(project.color, 0.2) }]}>
              <AppIcon name={project.icon} size={24} color={project.color} />
            </View>
            <AppText variant="title" numberOfLines={2}>
              {project.name}
            </AppText>
            {project.description ? (
              <AppText variant="body" tone="secondary" style={styles.desc}>
                {project.description}
              </AppText>
            ) : null}
            <AppText variant="caption" tone="tertiary" style={styles.created}>
              {t('projects.createdOn', { date: formatDate(isoToDateKey(project.createdAt), language, { day: 'numeric', month: 'long', year: 'numeric' }) })}
            </AppText>
          </View>
          <ProgressRing progress={percent / 100} size={92} strokeWidth={9} color={project.color} trackColor={withAlpha(project.color, 0.18)}>
            <AppText variant="subheading">{percent}%</AppText>
            <AppText variant="caption" tone="tertiary">
              {done.length}/{total}
            </AppText>
          </ProgressRing>
        </View>
      </Card>

      <SectionHeader title={t('filter.all')} count={open.length} actionLabel={t('common.add')} onAction={() => openQuickAdd({ projectId: project.id })} />
      {open.length ? (
        open.map((task) => <TaskItem key={task.id} task={task} today={today} showProject={false} />)
      ) : (
        <EmptyState compact icon={ListTodo} title={t('projects.noTasks')} color={project.color} actionLabel={t('task.new')} onAction={() => openQuickAdd({ projectId: project.id })} />
      )}

      {done.length ? (
        <>
          <View style={styles.doneToggle}>
            <Chip label={`${t('projects.completedSection')} (${done.length})`} selected={showDone} onPress={() => setShowDone((v) => !v)} />
          </View>
          {showDone ? done.map((task) => <TaskItem key={task.id} task={task} today={today} showProject={false} />) : null}
        </>
      ) : null}

      <View style={styles.actions}>
        <Button label={t('task.new')} icon={Plus} variant="soft" onPress={() => openQuickAdd({ projectId: project.id })} fullWidth />
        <Button
          label={project.archived ? t('common.unarchive') : t('common.archive')}
          icon={project.archived ? ArchiveRestore : Archive}
          variant="secondary"
          onPress={() => void updateProject(project.id, { archived: !project.archived }).then(() => haptics.success())}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { marginTop: spacing.sm, padding: spacing.xl, borderRadius: radius.xl },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  icon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  desc: { marginTop: spacing.xs },
  created: { marginTop: spacing.sm },
  doneToggle: { flexDirection: 'row', marginTop: spacing.lg, marginBottom: spacing.md },
  actions: { marginTop: spacing.xxl, gap: spacing.sm },
});
