import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Card, ColorPicker, IconButton, Screen, SectionHeader } from '@/components/ui';
import { useT } from '@/i18n';
import { useProjectStore } from '@/store/projectStore';
import { toast } from '@/store/uiStore';
import { fonts, radius, spacing, useTheme, withAlpha, ACCENT_COLORS } from '@/theme';
import { haptics } from '@/utils/haptics';

function CreateRow({ placeholder, onCreate }: { placeholder: string; onCreate: (name: string, color: string) => Promise<void> }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(ACCENT_COLORS[0]);
  const submit = async () => {
    if (!name.trim()) return;
    await onCreate(name, color);
    setName('');
  };
  return (
    <Card>
      <View style={[styles.input, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[styles.swatch, { backgroundColor: color }]} />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          style={[styles.text, { color: colors.text }]}
          maxLength={40}
          onSubmitEditing={() => void submit()}
          returnKeyType="done"
          accessibilityLabel={placeholder}
        />
        <IconButton icon={Plus} onPress={() => void submit()} disabled={!name.trim()} accessibilityLabel={placeholder} variant="primary" size={18} style={styles.add} />
      </View>
      <View style={styles.colors}>
        <ColorPicker value={color} onChange={setColor} />
      </View>
    </Card>
  );
}

export default function CategoriesScreen() {
  const t = useT();
  const { colors } = useTheme();
  const categories = useProjectStore((s) => s.categories);
  const tags = useProjectStore((s) => s.tags);
  const { createCategory, deleteCategory, createTag, deleteTag } = useProjectStore.getState();

  const confirm = (name: string, action: () => Promise<void>) =>
    Alert.alert(`${t('common.delete')} “${name}”?`, undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => void action().then(() => haptics.medium()).catch(() => toast.error(t('error.saveFailed'))) },
    ]);

  return (
    <Screen back title={t('categories.title')} large>
      <SectionHeader title={t('categories.categories')} count={categories.length} />
      <CreateRow
        placeholder={t('categories.newCategory')}
        onCreate={async (name, color) => {
          try {
            await createCategory(name, color);
            haptics.success();
          } catch (e) {
            haptics.error();
            toast.error(e instanceof Error && e.message === 'duplicate' ? t('categories.duplicate') : t('error.saveFailed'));
          }
        }}
      />
      <View style={styles.list}>
        {categories.length === 0 ? (
          <AppText variant="label" tone="tertiary">
            {t('categories.empty')}
          </AppText>
        ) : (
          categories.map((c) => (
            <View key={c.id} style={[styles.pill, { backgroundColor: withAlpha(c.color, 0.14) }]}>
              <View style={[styles.dot, { backgroundColor: c.color }]} />
              <AppText variant="label" color={c.color}>
                {c.name}
              </AppText>
              <IconButton icon={X} onPress={() => confirm(c.name, () => deleteCategory(c.id))} accessibilityLabel={`${t('common.delete')} ${c.name}`} size={14} color={c.color} style={styles.remove} />
            </View>
          ))
        )}
      </View>

      <SectionHeader title={t('categories.tags')} count={tags.length} />
      <CreateRow
        placeholder={t('categories.newTag')}
        onCreate={async (name, color) => {
          try {
            await createTag(name, color);
            haptics.success();
          } catch {
            toast.error(t('error.saveFailed'));
          }
        }}
      />
      <View style={styles.list}>
        {tags.length === 0 ? (
          <AppText variant="label" tone="tertiary">
            {t('categories.empty')}
          </AppText>
        ) : (
          tags.map((tag) => (
            <View key={tag.id} style={[styles.pill, { backgroundColor: withAlpha(tag.color, 0.14) }]}>
              <AppText variant="label" color={tag.color}>
                #{tag.name}
              </AppText>
              <IconButton icon={X} onPress={() => confirm(tag.name, () => deleteTag(tag.id))} accessibilityLabel={`${t('common.delete')} ${tag.name}`} size={14} color={colors.textSecondary} style={styles.remove} />
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, paddingLeft: spacing.md, paddingRight: spacing.xs, height: 52, gap: spacing.sm },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  text: { flex: 1, fontFamily: fonts.medium, fontSize: 15, height: '100%' },
  add: { width: 40, height: 40 },
  colors: { marginTop: spacing.md },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingLeft: spacing.md, borderRadius: radius.full, height: 36 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  remove: { width: 32, height: 32 },
});
