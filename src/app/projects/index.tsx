import { router } from 'expo-router';
import { FolderKanban, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProjectCard } from '@/components/projects/ProjectCard';
import { Chip, EmptyState, IconButton, Screen, SectionHeader } from '@/components/ui';
import { useT } from '@/i18n';
import { useProjectStore } from '@/store/projectStore';
import { spacing } from '@/theme';

export default function ProjectsScreen() {
  const t = useT();
  const projects = useProjectStore((s) => s.projects);
  const [showArchived, setShowArchived] = useState(false);
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const create = () => router.push('/projects/edit');

  return (
    <Screen back title={t('projects.title')} large right={<IconButton icon={Plus} variant="primary" onPress={create} accessibilityLabel={t('projects.new')} />}>
      {active.length === 0 && archived.length === 0 ? (
        <EmptyState icon={FolderKanban} title={t('projects.empty')} message={t('projects.emptyHint')} actionLabel={t('projects.new')} onAction={create} />
      ) : (
        <>
          {active.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
          {archived.length ? (
            <>
              <View style={styles.archivedToggle}>
                <Chip label={`${t('notes.archived')} (${archived.length})`} selected={showArchived} onPress={() => setShowArchived((v) => !v)} />
              </View>
              {showArchived ? (
                <>
                  <SectionHeader title={t('notes.archived')} />
                  {archived.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ archivedToggle: { flexDirection: 'row', marginTop: spacing.md } });
