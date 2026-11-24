import { router, type Href } from 'expo-router';
import { BarChart3, FolderKanban, Inbox, ListTodo, Settings, Shapes, Timer, type LucideIcon } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Card, ListRow, SectionHeader, TAB_BAR_SPACE } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { useT } from '@/i18n';
import { focusSecondsOn } from '@/services/statisticsService';
import { useFocusStore } from '@/store/focusStore';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import { radius, spacing, useTheme, withAlpha } from '@/theme';
import { formatDuration } from '@/utils/date';
import { isInbox, isOpen } from '@/utils/taskFilters';

function Tile({ icon: Icon, color, title, hint, href }: { icon: LucideIcon; color: string; title: string; hint: string; href: Href }) {
  return (
    <Card onPress={() => router.push(href)} style={styles.tile} accessibilityLabel={`${title}, ${hint}`}>
      <View style={[styles.tileIcon, { backgroundColor: withAlpha(color, 0.14) }]}>
        <Icon size={22} color={color} strokeWidth={2.1} />
      </View>
      <AppText variant="subheading" numberOfLines={1}>
        {title}
      </AppText>
      <AppText variant="caption" tone="tertiary" numberOfLines={1}>
        {hint}
      </AppText>
    </Card>
  );
}

export default function MoreScreen() {
  const t = useT();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useProjectStore((s) => s.projects);
  const sessions = useFocusStore((s) => s.sessions);
  const focusStatus = useFocusStore((s) => s.status);
  const userName = useSettingsStore((s) => s.settings.userName);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm, paddingBottom: TAB_BAR_SPACE + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <AppText variant="heading" color="#FFFFFF">
              {(userName.trim()[0] ?? 'O').toUpperCase()}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="title" accessibilityRole="header">
              {userName || t('more.title')}
            </AppText>
            <AppText variant="caption" tone="tertiary">
              {t('settings.storageValue')}
            </AppText>
          </View>
        </View>

        <SectionHeader title={t('more.workspace')} />
        <View style={styles.grid}>
          <Tile icon={Inbox} color="#0EA5E9" title={t('inbox.title')} hint={t('more.inboxHint', { count: tasks.filter(isInbox).length })} href="/inbox" />
          <Tile icon={ListTodo} color={colors.primary} title={t('myTasks.title')} hint={t('more.tasksHint', { count: tasks.filter(isOpen).length })} href="/tasks" />
          <Tile icon={FolderKanban} color="#F5A524" title={t('projects.title')} hint={t('more.projectsHint', { count: projects.filter((p) => !p.archived).length })} href="/projects" />
          <Tile
            icon={Timer}
            color="#14B8A6"
            title={t('focus.title')}
            hint={focusStatus === 'running' ? '● ' + t('focus.resume') : `${formatDuration(focusSecondsOn(sessions, today))} · ${t('more.focusHint')}`}
            href="/focus"
          />
        </View>

        <SectionHeader title={t('more.tools')} />
        <Card padded={false}>
          <View style={styles.inner}>
            <ListRow icon={BarChart3} iconColor="#8B5CF6" title={t('stats.title')} subtitle={t('more.statsHint')} onPress={() => router.push('/statistics')} />
            <ListRow icon={Shapes} iconColor="#EC4899" title={t('categories.title')} subtitle={t('more.categoriesHint')} onPress={() => router.push('/settings/categories')} last />
          </View>
        </Card>

        <SectionHeader title={t('more.app')} />
        <Card padded={false}>
          <View style={styles.inner}>
            <ListRow icon={Settings} iconColor={colors.textSecondary} title={t('settings.title')} subtitle={t('more.settingsHint')} onPress={() => router.push('/settings')} last />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  avatar: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexBasis: '47%', flexGrow: 1, gap: 2 },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  inner: { paddingHorizontal: spacing.lg },
});
