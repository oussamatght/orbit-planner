import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { useNoteStore } from '@/store/noteStore';
import { toast } from '@/store/uiStore';
import { spacing, ACCENT_COLORS } from '@/theme';
import type { Notebook } from '@/types/models';
import { haptics } from '@/utils/haptics';

import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { ColorPicker, IconPicker } from '../ui/Pickers';
import { Sheet } from '../ui/Sheet';
import { TextField } from '../ui/TextField';

interface Props {
  visible: boolean;
  notebook: Notebook | null;
  onClose: () => void;
  onCreated?: (notebook: Notebook) => void;
  onDeleted?: () => void;
}

/** Create / edit / delete a notebook. The form remounts per notebook so it always starts from fresh values. */
export function NotebookSheet({ visible, notebook, onClose, onCreated, onDeleted }: Props) {
  const t = useT();
  return (
    <Sheet visible={visible} onClose={onClose} title={notebook ? t('notes.editNotebook') : t('notes.newNotebook')}>
      {visible ? <NotebookForm key={notebook?.id ?? 'new'} notebook={notebook} onClose={onClose} onCreated={onCreated} onDeleted={onDeleted} /> : null}
    </Sheet>
  );
}

function NotebookForm({ notebook, onClose, onCreated, onDeleted }: Omit<Props, 'visible'>) {
  const t = useT();
  const { createNotebook, updateNotebook, deleteNotebook } = useNoteStore.getState();
  const count = useNoteStore((s) => s.notebooks.length);
  const [name, setName] = useState(notebook?.name ?? '');
  const [color, setColor] = useState<string>(notebook?.color ?? ACCENT_COLORS[(count + 2) % ACCENT_COLORS.length]);
  const [icon, setIcon] = useState(notebook?.icon ?? 'notebook');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      setError(t('common.required'));
      return;
    }
    try {
      if (notebook) await updateNotebook(notebook.id, { name, color, icon });
      else onCreated?.(await createNotebook({ name, color, icon }));
      haptics.success();
      onClose();
    } catch {
      toast.error(t('error.saveFailed'));
    }
  };

  const remove = () => {
    if (!notebook) return;
    Alert.alert(t('notes.deleteNotebookConfirm'), t('notes.deleteNotebookBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNotebook(notebook.id);
            haptics.medium();
            onDeleted?.();
            onClose();
          } catch {
            toast.error(t('error.saveFailed'));
          }
        },
      },
    ]);
  };

  return (
    <View>
      <TextField
        label={t('common.name')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        placeholder={t('notes.notebookPlaceholder')}
        maxLength={40}
        error={error}
      />
      <AppText variant="label" tone="secondary" style={styles.label}>
        {t('common.color')}
      </AppText>
      <ColorPicker value={color} onChange={setColor} />
      <AppText variant="label" tone="secondary" style={[styles.label, styles.spaced]}>
        {t('common.icon')}
      </AppText>
      <IconPicker value={icon} onChange={setIcon} color={color} />
      <View style={styles.footer}>
        {notebook ? <Button label={t('common.delete')} variant="danger" onPress={remove} style={styles.flex} /> : null}
        <Button label={notebook ? t('common.save') : t('common.create')} onPress={() => void save()} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { marginBottom: spacing.sm },
  spaced: { marginTop: spacing.lg },
  footer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
});
