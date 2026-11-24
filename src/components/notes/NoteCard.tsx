import { router } from 'expo-router';
import { CheckSquare, Pin, Square } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLanguage, useT } from '@/i18n';
import { useNoteStore } from '@/store/noteStore';
import { radius, shadow, spacing, useTheme, withAlpha } from '@/theme';
import type { Note } from '@/types/models';
import { isoToDateKey } from '@/utils/date';
import { relativeDate } from '@/utils/format';
import { checklistProgress, parseNote } from '@/utils/noteContent';

import { AppText } from '../ui/AppText';
import { PressableScale } from '../ui/PressableScale';

export const NoteCard = memo(function NoteCard({ note, onLongPress }: { note: Note; onLongPress?: (note: Note) => void }) {
  const t = useT();
  const language = useLanguage();
  const { colors, dark } = useTheme();
  const notebook = useNoteStore((s) => (note.notebookId ? s.notebooks.find((n) => n.id === note.notebookId) : undefined));
  const tinted = !!note.color;
  const ink = tinted ? colors.noteText : colors.text;
  const subInk = tinted ? withAlpha(colors.noteText, 0.68) : colors.textSecondary;
  const lines = parseNote(note.content).filter((l) => l.text.trim() || l.kind === 'check').slice(0, 7);
  const progress = checklistProgress(note.content);

  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/notes/[id]', params: { id: note.id } })}
      onLongPress={() => onLongPress?.(note)}
      pressedScale={0.97}
      accessibilityLabel={note.title || lines[0]?.text || t('notes.new')}
      style={[
        styles.card,
        { backgroundColor: note.color ?? colors.surface, borderColor: tinted ? 'transparent' : colors.border },
        !dark && shadow(1),
      ]}
    >
      <View style={styles.head}>
        {note.title ? (
          <AppText variant="subheading" color={ink} numberOfLines={2} style={styles.flex}>
            {note.title}
          </AppText>
        ) : (
          <View style={styles.flex} />
        )}
        {note.pinned ? <Pin size={14} color={subInk} fill={subInk} /> : null}
      </View>
      {lines.map((line) =>
        line.kind === 'check' ? (
          <View key={line.index} style={styles.check}>
            {line.checked ? <CheckSquare size={13} color={subInk} /> : <Square size={13} color={subInk} />}
            <AppText variant="caption" color={subInk} numberOfLines={1} style={[styles.flex, line.checked && styles.strike]}>
              {line.text}
            </AppText>
          </View>
        ) : (
          <AppText key={line.index} variant="caption" color={subInk} numberOfLines={2} style={styles.text}>
            {line.text}
          </AppText>
        ),
      )}
      <View style={styles.footer}>
        {notebook ? (
          <View style={[styles.badge, { backgroundColor: withAlpha(notebook.color, tinted ? 0.22 : 0.14) }]}>
            <AppText variant="caption" color={tinted ? colors.noteText : notebook.color} numberOfLines={1} style={styles.badgeText}>
              {notebook.name}
            </AppText>
          </View>
        ) : null}
        {progress.total ? (
          <AppText variant="caption" color={subInk}>
            {progress.done}/{progress.total}
          </AppText>
        ) : null}
        <AppText variant="caption" color={withAlpha(tinted ? colors.noteText : colors.textTertiary, tinted ? 0.55 : 1)} style={styles.date}>
          {relativeDate(isoToDateKey(note.updatedAt), t, language)}
        </AppText>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: radius.lg, padding: spacing.md + 2, borderWidth: StyleSheet.hairlineWidth, gap: 4, marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  check: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strike: { textDecorationLine: 'line-through' },
  text: { lineHeight: 17 },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.xs, maxWidth: 100 },
  badgeText: { fontSize: 11 },
  date: { marginLeft: 'auto', fontSize: 11 },
});
