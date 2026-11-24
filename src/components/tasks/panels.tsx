import { Bell, CalendarDays, Check, ChevronLeft, ChevronRight, Flag, Plus, Sunrise, Sun, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppIcon } from '../ui/AppIcon';

import { useLanguage, useT } from '@/i18n';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';
import { fonts, radius, spacing, useTheme, withAlpha, ACCENT_COLORS } from '@/theme';
import { PRIORITIES, PRIORITY_KEYS, type DateKey, type Priority, type Recurrence, type RecurrenceFrequency } from '@/types/models';
import { addDays, addMonths, formatDate, minutesToTime, startOfMonth, timeToMinutes } from '@/utils/date';
import { REMINDER_PRESETS, reminderLabel, weekdayShort } from '@/utils/format';
import { haptics } from '@/utils/haptics';

import { MonthGrid } from '../calendar/MonthGrid';
import { AppText } from '../ui/AppText';
import { Chip } from '../ui/Chip';
import { IconButton } from '../ui/IconButton';
import { Stepper } from '../ui/Pickers';
import { PressableScale } from '../ui/PressableScale';

/* ---------------------------------- Date ---------------------------------- */

interface DatePanelProps {
  value: DateKey | null;
  today: DateKey;
  onChange: (value: DateKey | null) => void;
  allowClear?: boolean;
}

export function DatePanel({ value, today, onChange, allowClear = true }: DatePanelProps) {
  const t = useT();
  const language = useLanguage();
  const weekStartsOn = useSettingsStore((s) => s.settings.weekStartsOn);
  const [month, setMonth] = useState(startOfMonth(value ?? today));
  const nextWeek = addDays(today, ((weekStartsOn - new Date().getDay() + 7) % 7) || 7);

  const quick: { label: string; value: DateKey | null; icon: typeof Sun }[] = [
    { label: t('common.today'), value: today, icon: Sun },
    { label: t('common.tomorrow'), value: addDays(today, 1), icon: Sunrise },
    { label: t('common.nextWeek'), value: nextWeek, icon: CalendarDays },
  ];

  return (
    <View>
      <View style={styles.chipRow}>
        {quick.map((q) => (
          <Chip key={q.label} label={q.label} icon={q.icon} selected={value === q.value} onPress={() => onChange(q.value)} />
        ))}
        {allowClear ? <Chip label={t('common.noDate')} icon={X} selected={value === null} onPress={() => onChange(null)} /> : null}
      </View>
      <View style={styles.monthHeader}>
        <AppText variant="subheading">{formatDate(month, language, { month: 'long', year: 'numeric' })}</AppText>
        <View style={styles.row}>
          <IconButton icon={ChevronLeft} flipRTL onPress={() => setMonth(addMonths(month, -1))} accessibilityLabel="Previous month" size={20} />
          <IconButton icon={ChevronRight} flipRTL onPress={() => setMonth(addMonths(month, 1))} accessibilityLabel="Next month" size={20} />
        </View>
      </View>
      <MonthGrid month={month} selected={value} today={today} weekStartsOn={weekStartsOn} onSelect={onChange} compact />
    </View>
  );
}

/* ---------------------------------- Time ---------------------------------- */

interface TimePanelProps {
  value: string | null;
  onChange: (value: string | null) => void;
  allowClear?: boolean;
}

const MINUTES = [0, 15, 30, 45];

export function TimePanel({ value, onChange, allowClear = true }: TimePanelProps) {
  const t = useT();
  const { colors } = useTheme();
  const current = value ? timeToMinutes(value) : null;
  const hour = current !== null ? Math.floor(current / 60) : null;
  const minute = current !== null ? current % 60 : null;
  const suggestions = ['08:00', '09:00', '12:00', '14:00', '18:00', '20:00'];

  const setPart = (h: number, m: number) => {
    haptics.selection();
    onChange(minutesToTime(h * 60 + m));
  };

  return (
    <View>
      <View style={styles.chipRow}>
        {suggestions.map((s) => (
          <Chip key={s} label={s} selected={value === s} onPress={() => onChange(s)} size="sm" />
        ))}
        {allowClear ? <Chip label={t('picker.noTime')} selected={value === null} onPress={() => onChange(null)} size="sm" /> : null}
      </View>
      <AppText variant="overline" tone="tertiary" style={styles.panelLabel}>
        {t('task.time').toUpperCase()}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hours}>
        {Array.from({ length: 24 }, (_, h) => {
          const selected = h === hour;
          return (
            <PressableScale
              key={h}
              onPress={() => setPart(h, minute ?? 0)}
              style={[styles.hourCell, { backgroundColor: selected ? colors.primary : colors.surfaceAlt }]}
              accessibilityLabel={`${h} h`}
              accessibilityState={{ selected }}
            >
              <AppText variant="label" color={selected ? colors.onPrimary : colors.text}>
                {String(h).padStart(2, '0')}
              </AppText>
            </PressableScale>
          );
        })}
      </ScrollView>
      <View style={[styles.chipRow, styles.minutes]}>
        {MINUTES.map((m) => (
          <Chip
            key={m}
            label={`:${String(m).padStart(2, '0')}`}
            selected={minute === m}
            onPress={() => setPart(hour ?? 9, m)}
          />
        ))}
      </View>
    </View>
  );
}

/* -------------------------------- Priority -------------------------------- */

export function PriorityPanel({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  const t = useT();
  const { colors } = useTheme();
  return (
    <View style={styles.chipRow}>
      {[...PRIORITIES].reverse().map((p) => (
        <Chip
          key={p}
          label={t(`priority.${PRIORITY_KEYS[p]}`)}
          icon={Flag}
          color={colors.priority[PRIORITY_KEYS[p]]}
          selected={value === p}
          onPress={() => onChange(p)}
        />
      ))}
    </View>
  );
}

/* --------------------------------- Project -------------------------------- */

export function ProjectPanel({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const t = useT();
  const { colors } = useTheme();
  const projects = useProjectStore((s) => s.projects);
  const active = projects.filter((p) => !p.archived);
  return (
    <View style={styles.list}>
      <OptionRow label={t('task.inbox')} selected={value === null} onPress={() => onChange(null)} color={colors.textSecondary} icon="folder" />
      {active.map((p) => (
        <OptionRow key={p.id} label={p.name} selected={value === p.id} onPress={() => onChange(p.id)} color={p.color} icon={p.icon} />
      ))}
    </View>
  );
}

export function CategoryPanel({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const t = useT();
  const categories = useProjectStore((s) => s.categories);
  const createCategory = useProjectStore((s) => s.createCategory);
  const [draft, setDraft] = useState('');
  return (
    <View>
      <View style={styles.chipRow}>
        <Chip label={t('common.none')} selected={value === null} onPress={() => onChange(null)} />
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} dot={c.color} color={c.color} selected={value === c.id} onPress={() => onChange(c.id)} />
        ))}
      </View>
      <InlineCreate
        placeholder={t('categories.newCategory')}
        value={draft}
        onChange={setDraft}
        onSubmit={async () => {
          try {
            const color = ACCENT_COLORS[categories.length % ACCENT_COLORS.length];
            const c = await createCategory(draft, color);
            setDraft('');
            onChange(c.id);
          } catch {
            haptics.error();
          }
        }}
      />
    </View>
  );
}

/* ---------------------------------- Tags ---------------------------------- */

export function TagPanel({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const t = useT();
  const tags = useProjectStore((s) => s.tags);
  const createTag = useProjectStore((s) => s.createTag);
  const [draft, setDraft] = useState('');
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <View>
      {tags.length ? (
        <View style={styles.chipRow}>
          {tags.map((tag) => (
            <Chip key={tag.id} label={`#${tag.name}`} color={tag.color} selected={value.includes(tag.id)} onPress={() => toggle(tag.id)} />
          ))}
        </View>
      ) : null}
      <InlineCreate
        placeholder={t('picker.newTagPlaceholder')}
        value={draft}
        onChange={setDraft}
        onSubmit={async () => {
          try {
            const color = ACCENT_COLORS[(tags.length + 3) % ACCENT_COLORS.length];
            const tag = await createTag(draft, color);
            setDraft('');
            if (!value.includes(tag.id)) onChange([...value, tag.id]);
          } catch {
            haptics.error();
          }
        }}
      />
    </View>
  );
}

/* -------------------------------- Reminders ------------------------------- */

export function ReminderPanel({ value, onChange, hasDate }: { value: number[]; onChange: (v: number[]) => void; hasDate: boolean }) {
  const t = useT();
  if (!hasDate) {
    return (
      <View style={styles.notice}>
        <Bell size={16} color="#94A3B8" />
        <AppText variant="label" tone="secondary">
          {t('reminder.needsDate')}
        </AppText>
      </View>
    );
  }
  const toggle = (o: number) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <View style={styles.chipRow}>
      {REMINDER_PRESETS.map((o) => (
        <Chip key={o} label={reminderLabel(o, t)} icon={Bell} selected={value.includes(o)} onPress={() => toggle(o)} size="sm" />
      ))}
    </View>
  );
}

/* ------------------------------- Recurrence ------------------------------- */

export function RecurrencePanel({ value, onChange }: { value: Recurrence | null; onChange: (r: Recurrence | null) => void }) {
  const t = useT();
  const language = useLanguage();
  const weekStartsOn = useSettingsStore((s) => s.settings.weekStartsOn);
  const isCustom = !!value && (value.interval > 1 || (value.weekdays?.length ?? 0) > 0);
  const [custom, setCustom] = useState(isCustom);
  const frequencies: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
  const orderedDays = useMemo(() => Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7), [weekStartsOn]);

  return (
    <View>
      <View style={styles.chipRow}>
        <Chip label={t('repeat.none')} selected={!value} onPress={() => { setCustom(false); onChange(null); }} />
        {frequencies.map((f) => (
          <Chip
            key={f}
            label={t(`repeat.${f}`)}
            selected={!custom && value?.frequency === f}
            onPress={() => {
              setCustom(false);
              onChange({ frequency: f, interval: 1 });
            }}
          />
        ))}
        <Chip
          label={t('repeat.custom')}
          selected={custom}
          onPress={() => {
            setCustom(true);
            onChange(value ?? { frequency: 'weekly', interval: 1, weekdays: [] });
          }}
        />
      </View>
      {custom && value ? (
        <View style={styles.customBox}>
          <View style={styles.rowBetween}>
            <AppText variant="label" tone="secondary">
              {t('repeat.every')}
            </AppText>
            <Stepper
              label={t('repeat.every')}
              value={value.interval}
              min={1}
              max={99}
              onChange={(interval) => onChange({ ...value, interval })}
            />
          </View>
          <View style={styles.chipRow}>
            {frequencies.map((f) => (
              <Chip
                key={f}
                size="sm"
                label={t(`repeat.unit.${f}`)}
                selected={value.frequency === f}
                onPress={() => onChange({ ...value, frequency: f, weekdays: f === 'weekly' ? value.weekdays ?? [] : undefined })}
              />
            ))}
          </View>
          {value.frequency === 'weekly' ? (
            <View>
              <AppText variant="label" tone="secondary" style={styles.panelLabel}>
                {t('repeat.onDays')}
              </AppText>
              <View style={styles.chipRow}>
                {orderedDays.map((d) => {
                  const days = value.weekdays ?? [];
                  const selected = days.includes(d);
                  return (
                    <Chip
                      key={d}
                      size="sm"
                      label={weekdayShort(d, language)}
                      selected={selected}
                      onPress={() =>
                        onChange({ ...value, weekdays: selected ? days.filter((x) => x !== d) : [...days, d].sort() })
                      }
                    />
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* --------------------------------- Shared --------------------------------- */

function OptionRow({ label, selected, onPress, color, icon }: { label: string; selected: boolean; onPress: () => void; color: string; icon: string }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.98}
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.option, { backgroundColor: selected ? withAlpha(color, 0.12) : 'transparent' }]}
    >
      <View style={[styles.optionIcon, { backgroundColor: withAlpha(color, 0.16) }]}>
        <AppIcon name={icon} size={16} color={color} />
      </View>
      <AppText variant="bodyMedium" style={styles.flex} numberOfLines={1}>
        {label}
      </AppText>
      {selected ? <Check size={18} color={colors.primary} /> : null}
    </PressableScale>
  );
}

function InlineCreate({ placeholder, value, onChange, onSubmit }: { placeholder: string; value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.inlineCreate, { backgroundColor: colors.surfaceAlt }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={[styles.inlineInput, { color: colors.text }]}
        onSubmitEditing={() => value.trim() && onSubmit()}
        returnKeyType="done"
        maxLength={40}
        accessibilityLabel={placeholder}
      />
      <IconButton icon={Plus} onPress={() => value.trim() && onSubmit()} disabled={!value.trim()} accessibilityLabel={placeholder} size={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  panelLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  hours: { gap: spacing.xs + 2, paddingVertical: 2 },
  hourCell: { width: 46, height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  minutes: { marginTop: spacing.md },
  list: { gap: 2 },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: radius.md, minHeight: 48 },
  optionIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  inlineCreate: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, marginTop: spacing.md, paddingLeft: spacing.md },
  inlineInput: { flex: 1, height: 44, fontFamily: fonts.medium, fontSize: 14 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  customBox: { marginTop: spacing.lg, gap: spacing.md },
});
