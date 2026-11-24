import { router } from 'expo-router';
import { ArrowUp, Bell, CalendarDays, Clock, Flag, Folder, Hash, Maximize2, Repeat } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useToday } from '@/hooks/useToday';
import { useLanguage, useT } from '@/i18n';
import { createTask } from '@/services/taskActions';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { PRIORITY_KEYS, type DateKey, type Priority, type Recurrence } from '@/types/models';
import { formatTime } from '@/utils/date';
import { reminderLabel, recurrenceLabel, relativeDate } from '@/utils/format';

import { AppText } from '../ui/AppText';
import { Chip } from '../ui/Chip';
import { IconButton } from '../ui/IconButton';
import { PressableScale } from '../ui/PressableScale';
import { Sheet } from '../ui/Sheet';

import { DatePanel, PriorityPanel, ProjectPanel, RecurrencePanel, ReminderPanel, TagPanel, TimePanel } from './panels';

type Panel = 'date' | 'time' | 'priority' | 'project' | 'tags' | 'reminder' | 'repeat' | null;

/** Global quick-capture sheet: a title plus optional inline pickers. Opened from the FAB and many screens. */
export function QuickAddSheet() {
  const open = useUiStore((s) => s.quickAddOpen);
  const session = useUiStore((s) => s.quickAddSession);
  const close = useUiStore((s) => s.closeQuickAdd);
  return (
    <Sheet visible={open} onClose={close} scrollable={false}>
      <QuickAddForm key={session} />
    </Sheet>
  );
}

function QuickAddForm() {
  const t = useT();
  const language = useLanguage();
  const today = useToday();
  const { colors } = useTheme();
  const defaults = useUiStore((s) => s.quickAddDefaults);
  const close = useUiStore((s) => s.closeQuickAdd);
  const settings = useSettingsStore((s) => s.settings);
  const projects = useProjectStore((s) => s.projects);
  const tags = useProjectStore((s) => s.tags);
  const inputRef = useRef<TextInputInstance>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<DateKey | null>(defaults.dueDate ?? null);
  const [startTime, setStartTime] = useState<string | null>(defaults.startTime ?? null);
  const [priority, setPriority] = useState<Priority>(settings.defaultPriority);
  const [projectId, setProjectId] = useState<string | null>(defaults.projectId ?? null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [reminders, setReminders] = useState<number[]>(settings.defaultReminder !== null ? [settings.defaultReminder] : []);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  const project = projects.find((p) => p.id === projectId);
  const canSave = title.trim().length > 0 && !saving;

  const submit = async (expand = false) => {
    if (!canSave) return;
    setSaving(true);
    const task = await createTask({
      title,
      description,
      dueDate,
      startTime: dueDate ? startTime : null,
      priority,
      projectId,
      tagIds,
      reminderOffsets: dueDate ? reminders : [],
      recurrence,
    });
    setSaving(false);
    if (!task) return;
    if (expand) {
      close();
      router.push({ pathname: '/tasks/[id]', params: { id: task.id } });
      return;
    }
    // Stay open for rapid capture: keep context (date/project), clear the rest.
    setTitle('');
    setDescription('');
    setTagIds([]);
    setRecurrence(null);
    setPanel(null);
    inputRef.current?.focus();
  };

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  return (
    <>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={title}
          onChangeText={setTitle}
          placeholder={t('quickAdd.placeholder')}
          placeholderTextColor={colors.textTertiary}
          style={[styles.title, { color: colors.text }]}
          maxLength={200}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={() => void submit()}
          accessibilityLabel={t('task.title')}
        />
      </View>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t('task.descriptionPlaceholder')}
        placeholderTextColor={colors.textTertiary}
        style={[styles.description, { color: colors.textSecondary }]}
        multiline
        maxLength={1000}
        accessibilityLabel={t('common.description')}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
        <Chip
          icon={CalendarDays}
          label={dueDate ? relativeDate(dueDate, t, language, today) : t('quickAdd.date')}
          selected={!!dueDate || panel === 'date'}
          color={dueDate && dueDate < today ? colors.danger : undefined}
          onPress={() => toggle('date')}
        />
        {dueDate ? (
          <Chip icon={Clock} label={startTime ? formatTime(startTime, language) : t('task.time')} selected={!!startTime || panel === 'time'} onPress={() => toggle('time')} />
        ) : null}
        <Chip
          icon={Flag}
          label={t(`priority.${PRIORITY_KEYS[priority]}`)}
          color={colors.priority[PRIORITY_KEYS[priority]]}
          selected={priority !== 1 || panel === 'priority'}
          onPress={() => toggle('priority')}
        />
        <Chip icon={Folder} label={project?.name ?? t('task.inbox')} color={project?.color} selected={!!project || panel === 'project'} onPress={() => toggle('project')} />
        <Chip
          icon={Hash}
          label={tagIds.length ? tagIds.map((id) => tags.find((x) => x.id === id)?.name).filter(Boolean).join(', ') : t('task.tags')}
          selected={tagIds.length > 0 || panel === 'tags'}
          onPress={() => toggle('tags')}
        />
        {dueDate ? (
          <Chip
            icon={Bell}
            label={reminders.length === 1 ? reminderLabel(reminders[0], t) : reminders.length > 1 ? `${reminders.length}` : t('task.reminders')}
            selected={reminders.length > 0 || panel === 'reminder'}
            onPress={() => toggle('reminder')}
          />
        ) : null}
        <Chip icon={Repeat} label={recurrence ? recurrenceLabel(recurrence, t, language) : t('task.repeat')} selected={!!recurrence || panel === 'repeat'} onPress={() => toggle('repeat')} />
      </ScrollView>

      {panel ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={[styles.panel, { borderColor: colors.border }]}>
          <ScrollView style={styles.panelScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {panel === 'date' ? (
              <DatePanel
                value={dueDate}
                today={today}
                onChange={(d) => {
                  setDueDate(d);
                  if (!d) setStartTime(null);
                  setPanel(null);
                }}
              />
            ) : null}
            {panel === 'time' ? <TimePanel value={startTime} onChange={setStartTime} /> : null}
            {panel === 'priority' ? (
              <PriorityPanel
                value={priority}
                onChange={(p) => {
                  setPriority(p);
                  setPanel(null);
                }}
              />
            ) : null}
            {panel === 'project' ? (
              <ProjectPanel
                value={projectId}
                onChange={(id) => {
                  setProjectId(id);
                  setPanel(null);
                }}
              />
            ) : null}
            {panel === 'tags' ? <TagPanel value={tagIds} onChange={setTagIds} /> : null}
            {panel === 'reminder' ? <ReminderPanel value={reminders} onChange={setReminders} hasDate={!!dueDate} /> : null}
            {panel === 'repeat' ? <RecurrencePanel value={recurrence} onChange={setRecurrence} /> : null}
          </ScrollView>
        </Animated.View>
      ) : null}

      <View style={styles.footer}>
        <PressableScale onPress={() => void submit(true)} disabled={!canSave} style={styles.more} accessibilityLabel={t('task.moreOptions')}>
          <Maximize2 size={16} color={canSave ? colors.primaryText : colors.textTertiary} />
          <AppText variant="label" color={canSave ? colors.primaryText : colors.textTertiary}>
            {t('task.moreOptions')}
          </AppText>
        </PressableScale>
        <IconButton
          icon={ArrowUp}
          variant="primary"
          onPress={() => void submit()}
          disabled={!canSave}
          accessibilityLabel={t('quickAdd.add')}
          style={styles.send}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputRow: { paddingHorizontal: spacing.xl },
  title: { fontFamily: fonts.semibold, fontSize: 19, paddingVertical: spacing.sm },
  description: { fontFamily: fonts.regular, fontSize: 14, paddingHorizontal: spacing.xl, maxHeight: 90, paddingVertical: 4 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  panel: { marginHorizontal: spacing.xl, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  panelScroll: { maxHeight: 330 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  more: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, paddingVertical: spacing.sm },
  send: { borderRadius: radius.full },
});
