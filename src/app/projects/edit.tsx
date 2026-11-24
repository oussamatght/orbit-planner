import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';

import { iconFor } from '@/constants/icons';
import { AppText, Button, Chip, ColorPicker, IconButton, IconPicker, Screen, TextField } from '@/components/ui';
import { useLanguage, useT } from '@/i18n';
import { useProjectStore } from '@/store/projectStore';
import { toast } from '@/store/uiStore';
import { radius, spacing, withAlpha, ACCENT_COLORS } from '@/theme';
import type { Language } from '@/types/models';
import { haptics } from '@/utils/haptics';

const SUGGESTIONS: { name: Record<Language, string>; icon: string; color: string }[] = [
  { name: { en: 'University', fr: 'Université', ar: 'الجامعة' }, icon: 'graduation', color: '#F5A524' },
  { name: { en: 'Work', fr: 'Travail', ar: 'العمل' }, icon: 'briefcase', color: '#5B5BF6' },
  { name: { en: 'Personal', fr: 'Personnel', ar: 'شخصي' }, icon: 'home', color: '#22C55E' },
  { name: { en: 'Fitness', fr: 'Sport', ar: 'الرياضة' }, icon: 'dumbbell', color: '#EF4444' },
  { name: { en: 'Programming', fr: 'Programmation', ar: 'البرمجة' }, icon: 'code', color: '#0EA5E9' },
  { name: { en: 'Reading', fr: 'Lecture', ar: 'القراءة' }, icon: 'book-open', color: '#8B5CF6' },
  { name: { en: 'Shopping', fr: 'Courses', ar: 'التسوق' }, icon: 'cart', color: '#EC4899' },
];

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const t = useT();
  const language = useLanguage();
  const existing = useProjectStore((s) => (id ? s.projects.find((p) => p.id === id) : undefined));
  const { createProject, updateProject } = useProjectStore.getState();
  const projectCount = useProjectStore((s) => s.projects.length);

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? 'folder');
  const [color, setColor] = useState<string>(existing?.color ?? ACCENT_COLORS[projectCount % ACCENT_COLORS.length]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      setError(t('common.required'));
      haptics.warning();
      return;
    }
    setSaving(true);
    try {
      if (existing) await updateProject(existing.id, { name, description, icon, color });
      else await createProject({ name, description, icon, color });
      haptics.success();
      router.back();
    } catch {
      toast.error(t('error.saveFailed'));
      setSaving(false);
    }
  };

  return (
    <Screen
      title={existing ? t('projects.edit') : t('projects.new')}
      right={<IconButton icon={X} onPress={() => router.back()} accessibilityLabel={t('common.close')} variant="filled" />}
      footer={
        <View style={styles.footer}>
          <Button label={existing ? t('common.save') : t('common.create')} onPress={() => void save()} loading={saving} fullWidth size="lg" />
        </View>
      }
    >
      <View style={styles.preview}>
        <View style={[styles.previewIcon, { backgroundColor: withAlpha(color, 0.16) }]}>
          <AppIcon name={icon} size={34} color={color} />
        </View>
        <AppText variant="heading" numberOfLines={1}>
          {name.trim() || t('projects.namePlaceholder')}
        </AppText>
      </View>

      {!existing ? (
        <>
          <AppText variant="label" tone="secondary" style={styles.label}>
            {t('projects.suggestions')}
          </AppText>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Chip
                key={s.icon}
                label={s.name[language]}
                icon={iconFor(s.icon)}
                color={s.color}
                selected={name === s.name[language]}
                onPress={() => {
                  setName(s.name[language]);
                  setIcon(s.icon);
                  setColor(s.color);
                  setError(null);
                }}
              />
            ))}
          </View>
        </>
      ) : null}

      <TextField
        label={t('common.name')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          if (v.trim()) setError(null);
        }}
        placeholder={t('projects.namePlaceholder')}
        maxLength={60}
        error={error}
        autoFocus={!existing}
      />
      <TextField label={t('common.description')} value={description} onChangeText={setDescription} placeholder={t('projects.descriptionPlaceholder')} multiline maxLength={500} />

      <AppText variant="label" tone="secondary" style={styles.label}>
        {t('common.color')}
      </AppText>
      <ColorPicker value={color} onChange={setColor} />
      <AppText variant="label" tone="secondary" style={[styles.label, styles.spaced]}>
        {t('common.icon')}
      </AppText>
      <IconPicker value={icon} onChange={setIcon} color={color} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  previewIcon: { width: 76, height: 76, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  label: { marginBottom: spacing.sm },
  spaced: { marginTop: spacing.xl },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  footer: { padding: spacing.lg, paddingBottom: spacing.xxl },
});
