import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';

import { TimePanel } from '@/components/tasks/panels';
import { AppText, Button, Card, Chip, ColorPicker, IconButton, IconPicker, Screen, SegmentedControl, Stepper, TextField } from '@/components/ui';
import { iconFor } from '@/constants/icons';
import { useLanguage, useT } from '@/i18n';
import { useHabitStore } from '@/store/habitStore';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import { radius, spacing, useTheme, withAlpha, ACCENT_COLORS } from '@/theme';
import type { HabitFrequency, Language } from '@/types/models';
import { formatTime } from '@/utils/date';
import { weekdayShort } from '@/utils/format';
import { haptics } from '@/utils/haptics';

type FreqType = HabitFrequency['type'];

const SUGGESTIONS: { name: Record<Language, string>; icon: string; color: string; target?: number }[] = [
  { name: { en: 'Read 20 minutes', fr: 'Lire 20 minutes', ar: 'القراءة 20 دقيقة' }, icon: 'book-open', color: '#8B5CF6' },
  { name: { en: 'Study', fr: 'Étudier', ar: 'المذاكرة' }, icon: 'graduation', color: '#F5A524' },
  { name: { en: 'Exercise', fr: 'Faire du sport', ar: 'التمرين' }, icon: 'dumbbell', color: '#EF4444' },
  { name: { en: 'Drink water', fr: 'Boire de l’eau', ar: 'شرب الماء' }, icon: 'droplet', color: '#0EA5E9', target: 8 },
  { name: { en: 'Practice programming', fr: 'Programmer', ar: 'التدرب على البرمجة' }, icon: 'code', color: '#14B8A6' },
  { name: { en: 'Meditate', fr: 'Méditer', ar: 'التأمل' }, icon: 'brain', color: '#EC4899' },
];

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const t = useT();
  const language = useLanguage();
  const { colors } = useTheme();
  const existing = useHabitStore((s) => (id ? s.habits.find((h) => h.id === id) : undefined));
  const habitCount = useHabitStore((s) => s.habits.length);
  const weekStartsOn = useSettingsStore((s) => s.settings.weekStartsOn);
  const { createHabit, updateHabit } = useHabitStore.getState();

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? 'sparkles');
  const [color, setColor] = useState<string>(existing?.color ?? ACCENT_COLORS[(habitCount + 4) % ACCENT_COLORS.length]);
  const [freqType, setFreqType] = useState<FreqType>(existing?.frequency.type ?? 'daily');
  const [days, setDays] = useState<number[]>(existing?.frequency.type === 'weekdays' ? existing.frequency.days : [1, 2, 3, 4, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState(existing?.frequency.type === 'weekly' ? existing.frequency.timesPerWeek : 3);
  const [target, setTarget] = useState(existing?.targetPerDay ?? 1);
  const [reminderOn, setReminderOn] = useState(!!existing?.reminderTime);
  const [reminderTime, setReminderTime] = useState(existing?.reminderTime ?? '08:00');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const orderedDays = useMemo(() => Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7), [weekStartsOn]);

  const save = async () => {
    if (!name.trim()) {
      setError(t('common.required'));
      haptics.warning();
      return;
    }
    if (freqType === 'weekdays' && days.length === 0) {
      haptics.warning();
      toast.error(t('repeat.onDays'));
      return;
    }
    const frequency: HabitFrequency =
      freqType === 'weekdays' ? { type: 'weekdays', days } : freqType === 'weekly' ? { type: 'weekly', timesPerWeek } : { type: 'daily' };
    const input = { name, description, icon, color, frequency, targetPerDay: target, reminderTime: reminderOn ? reminderTime : null };
    setSaving(true);
    try {
      if (existing) await updateHabit(existing.id, input);
      else await createHabit(input);
      haptics.success();
      router.back();
    } catch {
      toast.error(t('error.saveFailed'));
      setSaving(false);
    }
  };

  return (
    <Screen
      title={existing ? t('habits.edit') : t('habits.new')}
      right={<IconButton icon={X} onPress={() => router.back()} accessibilityLabel={t('common.close')} variant="filled" />}
      footer={
        <View style={styles.footer}>
          <Button label={existing ? t('common.save') : t('common.create')} onPress={() => void save()} loading={saving} fullWidth size="lg" />
        </View>
      }
    >
      <View style={styles.preview}>
        <View style={[styles.previewIcon, { backgroundColor: withAlpha(color, 0.16) }]}>
          <AppIcon name={icon} size={32} color={color} />
        </View>
      </View>

      {!existing ? (
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
                setTarget(s.target ?? 1);
                setError(null);
              }}
            />
          ))}
        </View>
      ) : null}

      <TextField label={t('common.name')} value={name} onChangeText={(v) => { setName(v); if (v.trim()) setError(null); }} placeholder={t('habits.namePlaceholder')} maxLength={60} error={error} />
      <TextField label={t('common.description')} value={description} onChangeText={setDescription} placeholder={t('common.optional')} maxLength={300} />

      <AppText variant="label" tone="secondary" style={styles.label}>
        {t('habits.frequency')}
      </AppText>
      <SegmentedControl
        options={[
          { value: 'daily', label: t('habits.freq.daily') },
          { value: 'weekdays', label: t('habits.freq.weekdays') },
          { value: 'weekly', label: t('habits.freq.weekly') },
        ]}
        value={freqType}
        onChange={setFreqType}
      />
      {freqType === 'weekdays' ? (
        <View style={styles.days}>
          {orderedDays.map((d) => (
            <Chip key={d} size="sm" label={weekdayShort(d, language)} color={color} selected={days.includes(d)} onPress={() => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))} />
          ))}
        </View>
      ) : null}
      {freqType === 'weekly' ? (
        <View style={styles.inline}>
          <AppText variant="bodyMedium">{t('habits.timesPerWeek', { count: timesPerWeek })}</AppText>
          <Stepper label={t('habits.freq.weekly')} value={timesPerWeek} min={1} max={7} onChange={setTimesPerWeek} />
        </View>
      ) : null}

      <View style={styles.inline}>
        <View style={styles.flex}>
          <AppText variant="bodyMedium">{t('habits.target')}</AppText>
          <AppText variant="caption" tone="tertiary">
            {t('habits.targetHint')}
          </AppText>
        </View>
        <Stepper label={t('habits.target')} value={target} min={1} max={50} onChange={setTarget} />
      </View>

      <Card style={styles.reminder}>
        <View style={styles.inlineNoMargin}>
          <View style={styles.flex}>
            <AppText variant="bodyMedium">{t('habits.reminder')}</AppText>
            <AppText variant="caption" tone="tertiary">
              {reminderOn ? formatTime(reminderTime, language) : t('habits.noReminder')}
            </AppText>
          </View>
          <Switch value={reminderOn} onValueChange={setReminderOn} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor="#FFFFFF" accessibilityLabel={t('habits.reminder')} />
        </View>
        {reminderOn ? (
          <View style={styles.timePanel}>
            <TimePanel value={reminderTime} onChange={(v) => v && setReminderTime(v)} allowClear={false} />
          </View>
        ) : null}
      </Card>

      <AppText variant="label" tone="secondary" style={[styles.label, styles.spaced]}>
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
  flex: { flex: 1 },
  preview: { alignItems: 'center', marginVertical: spacing.lg },
  previewIcon: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  label: { marginBottom: spacing.sm },
  spaced: { marginTop: spacing.xl },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  inline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, gap: spacing.md },
  inlineNoMargin: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reminder: { marginTop: spacing.xl },
  timePanel: { marginTop: spacing.lg },
  footer: { padding: spacing.lg, paddingBottom: spacing.xxl },
});
