import { router, useLocalSearchParams } from 'expo-router';
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Check,
  CheckSquare,
  ChevronLeft,
  ListChecks,
  ListTodo,
  Palette,
  PenLine,
  Pin,
  SearchX,
  Square,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/ui/AppIcon';

import { AppText, Chip, EmptyState, IconButton, ListRow, PressableScale, Sheet } from '@/components/ui';
import { iconFor } from '@/constants/icons';
import { useLanguage, useT } from '@/i18n';
import { createTask } from '@/services/taskActions';
import { useNoteStore } from '@/store/noteStore';
import { toast } from '@/store/uiStore';
import { fonts, NOTE_COLORS, radius, spacing, useTheme, withAlpha } from '@/theme';
import { isoToDateKey } from '@/utils/date';
import { relativeDate } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { firstLine, parseNote, toggleChecklistLine, wordCount } from '@/utils/noteContent';

export default function NoteEditorScreen() {
  const { id, isNew } = useLocalSearchParams<{ id: string; isNew?: string }>();
  const t = useT();
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const note = useNoteStore((s) => s.notes.find((n) => n.id === id));
  const notebooks = useNoteStore((s) => s.notebooks);
  const { updateNote, deleteNote, restoreNote } = useNoteStore.getState();

  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [preview, setPreview] = useState(isNew !== '1' && !!note?.content.includes('[ ]'));
  const [sheet, setSheet] = useState<'color' | 'notebook' | null>(null);
  const latest = useRef({ title, content });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    latest.current = { title, content };
  }, [title, content]);

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const current = useNoteStore.getState().notes.find((n) => n.id === id);
    if (!current) return;
    const { title: tt, content: cc } = latest.current;
    if (tt !== current.title || cc !== current.content) void updateNote(id, { title: tt, content: cc }).catch(() => toast.error(t('error.saveFailed')));
  };

  // Debounced autosave while typing.
  useEffect(() => {
    if (!note) return;
    if (title === note.title && content === note.content) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  // On leave: save pending edits, and discard a brand-new note that stayed empty.
  useEffect(
    () => () => {
      flush();
      const current = useNoteStore.getState().notes.find((n) => n.id === id);
      if (current && !latest.current.title.trim() && !latest.current.content.trim()) void deleteNote(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  if (!note) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <EmptyState icon={SearchX} title={t('notes.noResults')} actionLabel={t('common.back')} onAction={() => router.back()} />
      </View>
    );
  }

  const bg = note.color ?? colors.background;
  const ink = note.color ? colors.noteText : colors.text;
  const subInk = note.color ? withAlpha(colors.noteText, 0.6) : colors.textTertiary;
  const notebook = notebooks.find((n) => n.id === note.notebookId);
  const lines = parseNote(content);

  const addChecklistItem = () => {
    haptics.selection();
    setPreview(false);
    setContent((c) => (c.length === 0 || c.endsWith('\n') ? `${c}- [ ] ` : `${c}\n- [ ] `));
  };

  const confirmDelete = () =>
    Alert.alert(t('notes.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (timer.current) clearTimeout(timer.current);
          const removed = await deleteNote(note.id);
          haptics.medium();
          router.back();
          if (removed) toast.success(t('notes.deleted'), { label: t('common.undo'), onPress: () => void restoreNote(removed) });
        },
      },
    ]);

  const convertToTask = async () => {
    flush();
    const taskTitle = title.trim() || firstLine(content) || t('notes.new');
    const task = await createTask({ title: taskTitle, notes: content }, { silent: true });
    if (task) {
      toast.success(t('notes.taskCreated'), { label: t('common.edit'), onPress: () => router.push({ pathname: '/tasks/[id]', params: { id: task.id } }) });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: bg, paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <IconButton icon={ChevronLeft} flipRTL onPress={() => router.back()} accessibilityLabel={t('common.back')} color={ink} size={24} />
        <View style={styles.flex} />
        <IconButton
          icon={Pin}
          onPress={() => {
            haptics.selection();
            void updateNote(note.id, { pinned: !note.pinned });
          }}
          accessibilityLabel={note.pinned ? t('notes.unpin') : t('notes.pin')}
          color={note.pinned ? colors.primary : ink}
          size={20}
        />
        <IconButton icon={Palette} onPress={() => setSheet('color')} accessibilityLabel={t('common.color')} color={ink} size={20} />
        <IconButton icon={note.archived ? ArchiveRestore : Archive} onPress={() => { void updateNote(note.id, { archived: !note.archived }); haptics.success(); if (!note.archived) router.back(); }} accessibilityLabel={note.archived ? t('common.unarchive') : t('common.archive')} color={ink} size={20} />
        <IconButton icon={Trash2} onPress={confirmDelete} accessibilityLabel={t('common.delete')} color={colors.danger} size={20} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <PressableScale onPress={() => setSheet('notebook')} style={[styles.notebookPill, { backgroundColor: withAlpha(notebook?.color ?? subInk, 0.16) }]} accessibilityLabel={t('notes.notebooks')}>
          {notebook ? <AppIcon name={notebook.icon} size={13} color={note.color ? colors.noteText : notebook.color} /> : <BookOpen size={13} color={subInk} />}
          <AppText variant="caption" color={notebook ? (note.color ? colors.noteText : notebook.color) : subInk}>
            {notebook?.name ?? t('notes.noNotebook')}
          </AppText>
        </PressableScale>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('notes.titlePlaceholder')}
          placeholderTextColor={subInk}
          style={[styles.title, { color: ink }]}
          multiline
          maxLength={200}
          autoFocus={isNew === '1'}
          submitBehavior="blurAndSubmit"
          accessibilityLabel={t('notes.titlePlaceholder')}
        />

        {preview ? (
          <Pressable onPress={() => setPreview(false)} accessibilityHint="Tap to edit" style={styles.previewBox}>
            {lines.map((line) =>
              line.kind === 'check' ? (
                <Pressable
                  key={line.index}
                  onPress={() => {
                    haptics.light();
                    setContent((c) => toggleChecklistLine(c, line.index));
                  }}
                  style={styles.checkRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: line.checked }}
                  accessibilityLabel={line.text}
                >
                  {line.checked ? <CheckSquare size={20} color={colors.primary} /> : <Square size={20} color={subInk} />}
                  <AppText variant="body" color={line.checked ? subInk : ink} style={[styles.flex, line.checked && styles.strike]}>
                    {line.text}
                  </AppText>
                </Pressable>
              ) : (
                <AppText key={line.index} variant="body" color={ink} style={styles.previewText}>
                  {line.text || ' '}
                </AppText>
              ),
            )}
          </Pressable>
        ) : (
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={t('notes.contentPlaceholder')}
            placeholderTextColor={subInk}
            style={[styles.content, { color: ink }]}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            maxLength={100000}
            accessibilityLabel={t('notes.contentPlaceholder')}
          />
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { borderTopColor: withAlpha(ink, 0.08), paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <IconButton icon={ListChecks} onPress={addChecklistItem} accessibilityLabel={t('notes.checklist')} color={ink} size={20} />
        <IconButton icon={preview ? PenLine : CheckSquare} onPress={() => { flush(); setPreview((p) => !p); }} accessibilityLabel={preview ? t('common.edit') : t('notes.checklist')} color={ink} size={20} />
        <IconButton icon={ListTodo} onPress={() => void convertToTask()} accessibilityLabel={t('notes.convertToTask')} color={ink} size={20} />
        <View style={styles.flex} />
        <AppText variant="caption" color={subInk}>
          {t('notes.words', { count: wordCount(`${title} ${content}`) })} · {t('notes.edited', { date: relativeDate(isoToDateKey(note.updatedAt), t, language).toLowerCase() })}
        </AppText>
      </View>

      <Sheet visible={sheet === 'color'} onClose={() => setSheet(null)} title={t('common.color')}>
        <View style={styles.colors}>
          {NOTE_COLORS.map((c) => {
            const selected = (note.color ?? null) === c;
            return (
              <PressableScale
                key={c ?? 'default'}
                onPress={() => {
                  haptics.selection();
                  void updateNote(note.id, { color: c });
                }}
                accessibilityLabel={c ?? 'Default'}
                accessibilityState={{ selected }}
                style={[styles.swatch, { backgroundColor: c ?? colors.surface, borderColor: selected ? colors.primary : colors.border }]}
              >
                {selected ? <Check size={18} color={c ? colors.noteText : colors.text} /> : null}
              </PressableScale>
            );
          })}
        </View>
      </Sheet>

      <Sheet visible={sheet === 'notebook'} onClose={() => setSheet(null)} title={t('notes.notebooks')}>
        <ListRow title={t('notes.noNotebook')} icon={BookOpen} iconColor={colors.textSecondary} value={!note.notebookId ? '✓' : undefined} onPress={() => { void updateNote(note.id, { notebookId: null }); setSheet(null); }} />
        {notebooks.map((nb, i) => (
          <ListRow
            key={nb.id}
            title={nb.name}
            icon={iconFor(nb.icon)}
            iconColor={nb.color}
            value={note.notebookId === nb.id ? '✓' : undefined}
            onPress={() => {
              void updateNote(note.id, { notebookId: nb.id });
              setSheet(null);
            }}
            last={i === notebooks.length - 1}
          />
        ))}
        {notebooks.length === 0 ? (
          <View style={styles.hint}>
            <Chip label={t('notes.newNotebook')} onPress={() => { setSheet(null); router.navigate('/notes'); }} />
          </View>
        ) : null}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, height: 56 },
  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
  notebookPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, marginBottom: spacing.md },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, paddingVertical: 0 },
  content: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 25, marginTop: spacing.md, minHeight: 300, paddingVertical: 0 },
  previewBox: { marginTop: spacing.md, minHeight: 300 },
  previewText: { fontSize: 16, lineHeight: 25 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  strike: { textDecorationLine: 'line-through' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.sm, paddingTop: spacing.xs },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', marginTop: spacing.md },
});
