import { router } from 'expo-router';
import { Archive, NotebookPen, Plus, SearchX } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NoteCard } from '@/components/notes/NoteCard';
import { NotebookSheet } from '@/components/notes/NotebookSheet';
import { SearchBar } from '@/components/tasks/SearchBar';
import { AppText, Chip, EmptyState, IconButton, SectionHeader, TAB_BAR_SPACE } from '@/components/ui';
import { iconFor } from '@/constants/icons';
import { useT } from '@/i18n';
import { useNoteStore } from '@/store/noteStore';
import { toast } from '@/store/uiStore';
import { spacing, useTheme } from '@/theme';
import type { Note, Notebook } from '@/types/models';

type Scope = 'all' | 'archived' | string;

/** Splits notes into two columns, balancing by approximate card height. */
function columns(notes: Note[]): [Note[], Note[]] {
  const left: Note[] = [];
  const right: Note[] = [];
  let lh = 0;
  let rh = 0;
  for (const n of notes) {
    const h = 80 + Math.min(7, n.content.split('\n').length) * 18 + (n.title ? 22 : 0);
    if (lh <= rh) {
      left.push(n);
      lh += h;
    } else {
      right.push(n);
      rh += h;
    }
  }
  return [left, right];
}

export default function NotesScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const notes = useNoteStore((s) => s.notes);
  const notebooks = useNoteStore((s) => s.notebooks);
  const createNote = useNoteStore((s) => s.createNote);
  const [scope, setScope] = useState<Scope>('all');
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<{ open: boolean; notebook: Notebook | null }>({ open: false, notebook: null });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => (scope === 'archived' ? n.archived : !n.archived))
      .filter((n) => scope === 'all' || scope === 'archived' || n.notebookId === scope)
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, scope, query]);

  const pinned = filtered.filter((n) => n.pinned && scope !== 'archived');
  const others = filtered.filter((n) => !n.pinned || scope === 'archived');

  const newNote = async () => {
    try {
      const note = await createNote({ notebookId: scope !== 'all' && scope !== 'archived' ? scope : null });
      router.push({ pathname: '/notes/[id]', params: { id: note.id, isNew: '1' } });
    } catch {
      toast.error(t('error.saveFailed'));
    }
  };

  const renderGrid = (list: Note[]) => {
    const [left, right] = columns(list);
    return (
      <View style={styles.grid}>
        <View style={styles.col}>
          {left.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </View>
        <View style={styles.col}>
          {right.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </View>
      </View>
    );
  };

  const hasArchived = notes.some((n) => n.archived);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="title" accessibilityRole="header">
            {t('notes.title')}
          </AppText>
          <AppText variant="caption" tone="tertiary" numberOfLines={1}>
            {t('notes.subtitle')}
          </AppText>
        </View>
        <IconButton icon={Plus} variant="primary" onPress={() => void newNote()} accessibilityLabel={t('notes.new')} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + insets.bottom }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        {notes.length > 0 ? <SearchBar value={query} onChange={setQuery} placeholder={t('notes.searchPlaceholder')} /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
          <Chip label={t('notes.all')} selected={scope === 'all'} onPress={() => setScope('all')} />
          {notebooks.map((nb) => (
            <Chip
              key={nb.id}
              label={nb.name}
              icon={iconFor(nb.icon)}
              color={nb.color}
              selected={scope === nb.id}
              onPress={() => setScope(nb.id)}
              onLongPress={() => setSheet({ open: true, notebook: nb })}
              accessibilityLabel={`${nb.name}. Long press to edit`}
            />
          ))}
          <Chip label={t('notes.newNotebook')} icon={Plus} onPress={() => setSheet({ open: true, notebook: null })} />
          {hasArchived ? <Chip label={t('notes.archived')} icon={Archive} selected={scope === 'archived'} onPress={() => setScope('archived')} /> : null}
        </ScrollView>

        {notes.length === 0 ? (
          <EmptyState icon={NotebookPen} color="#F5A524" title={t('notes.empty')} message={t('notes.emptyHint')} actionLabel={t('notes.new')} onAction={() => void newNote()} />
        ) : filtered.length === 0 ? (
          <EmptyState compact icon={SearchX} title={t('notes.noResults')} />
        ) : (
          <>
            {pinned.length ? (
              <>
                <SectionHeader title={t('notes.pinned')} count={pinned.length} />
                {renderGrid(pinned)}
              </>
            ) : null}
            {others.length ? (
              <>
                {pinned.length ? <SectionHeader title={scope === 'archived' ? t('notes.archived') : t('notes.others')} count={others.length} /> : <View style={styles.gap} />}
                {renderGrid(others)}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <NotebookSheet
        visible={sheet.open}
        notebook={sheet.notebook}
        onClose={() => setSheet({ open: false, notebook: null })}
        onCreated={(nb) => setScope(nb.id)}
        onDeleted={() => setScope('all')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  content: { paddingHorizontal: spacing.lg },
  chipScroll: { marginHorizontal: -spacing.lg, flexGrow: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  grid: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1 },
  gap: { height: spacing.sm },
});
