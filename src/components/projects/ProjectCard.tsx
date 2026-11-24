import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from '../ui/AppIcon';

import { useT } from '@/i18n';
import { useTaskStore } from '@/store/taskStore';
import { radius, spacing, useTheme, withAlpha } from '@/theme';
import type { Project } from '@/types/models';
import { projectProgress } from '@/utils/taskFilters';

import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';

export const ProjectCard = memo(function ProjectCard({ project, variant = 'list' }: { project: Project; variant?: 'list' | 'compact' }) {
  const t = useT();
  const { colors } = useTheme();
  const tasks = useTaskStore((s) => s.tasks);
  const { total, done, percent } = projectProgress(tasks, project.id);
  const open = () => router.push({ pathname: '/projects/[id]', params: { id: project.id } });

  if (variant === 'compact') {
    return (
      <Card onPress={open} style={styles.compact} accessibilityLabel={`${project.name}, ${percent}%`}>
        <View style={[styles.icon, { backgroundColor: withAlpha(project.color, 0.15) }]}>
          <AppIcon name={project.icon} size={18} color={project.color} strokeWidth={2.2} />
        </View>
        <AppText variant="subheading" numberOfLines={1} style={styles.compactTitle}>
          {project.name}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {t('projects.tasks', { count: total - done })}
        </AppText>
        <View style={styles.compactBar}>
          <ProgressBar progress={percent / 100} color={project.color} height={5} />
        </View>
      </Card>
    );
  }

  return (
    <Card onPress={open} style={styles.card} accessibilityLabel={`${project.name}, ${percent}%`}>
      <View style={styles.row}>
        <View style={[styles.iconLarge, { backgroundColor: withAlpha(project.color, 0.15) }]}>
          <AppIcon name={project.icon} size={22} color={project.color} strokeWidth={2.2} />
        </View>
        <View style={styles.flex}>
          <AppText variant="subheading" numberOfLines={1}>
            {project.name}
          </AppText>
          <AppText variant="caption" tone="tertiary" numberOfLines={1}>
            {project.description || t('projects.tasks', { count: total })}
          </AppText>
        </View>
        <AppText variant="label" color={project.color}>
          {percent}%
        </AppText>
      </View>
      <View style={styles.barRow}>
        <View style={styles.flex}>
          <ProgressBar progress={percent / 100} color={project.color} trackColor={colors.surfaceAlt} />
        </View>
        <AppText variant="caption" tone="tertiary">
          {done}/{total}
        </AppText>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconLarge: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  compact: { width: 156, padding: spacing.md + 2 },
  icon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  compactTitle: { marginBottom: 2 },
  compactBar: { marginTop: spacing.md },
});
