import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import {
  Bell,
  BellRing,
  CalendarClock,
  Clock,
  Database,
  Download,
  Flame,
  HardDrive,
  Info,
  Shapes,
  Smartphone,
  Timer,
  Trash2,
  TriangleAlert,
  Upload,
  Vibrate,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';

import { TimePanel } from '@/components/tasks/panels';
import { AppText, Card, Chip, ListRow, Screen, SectionHeader, SegmentedControl, Sheet, Stepper, TextField } from '@/components/ui';
import { LANGUAGES, useLanguage, useT } from '@/i18n';
import { clearAllData, exportBackup, pickBackup, restoreBackup } from '@/services/backupService';
import { rescheduleAllNotifications } from '@/services/bootstrap';
import { changeLanguage } from '@/services/languageService';
import { cancelAllNotifications, ensurePermission, getPermissionState, type PermissionState } from '@/services/notificationService';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import { spacing, useTheme } from '@/theme';
import { PRIORITIES, PRIORITY_KEYS, type AppSettings } from '@/types/models';
import { formatTime } from '@/utils/date';
import { REMINDER_PRESETS, reminderLabel } from '@/utils/format';
import { haptics } from '@/utils/haptics';

export default function SettingsScreen() {
  const t = useT();
  const language = useLanguage();
  const { colors } = useTheme();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const [name, setName] = useState(settings.userName);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [timeSheet, setTimeSheet] = useState(false);
  const [busy, setBusy] = useState<'export' | 'import' | 'clear' | null>(null);

  useFocusEffect(
    useCallback(() => {
      void getPermissionState().then(setPermission);
    }, []),
  );

  const set = async (patch: Partial<AppSettings>, reschedule = false) => {
    try {
      await update(patch);
      haptics.selection();
      if (reschedule) void rescheduleAllNotifications();
    } catch {
      toast.error(t('error.saveFailed'));
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    await set({ notificationsEnabled: enabled });
    if (enabled) {
      const granted = await ensurePermission();
      setPermission(granted ? 'granted' : await getPermissionState());
      if (granted) await rescheduleAllNotifications();
    } else {
      await cancelAllNotifications();
    }
  };

  const doExport = async () => {
    setBusy('export');
    try {
      const result = await exportBackup();
      haptics.success();
      toast.success(result === 'shared' ? t('settings.exportSuccess') : t('settings.exportSaved'));
    } catch (e) {
      console.warn(e);
      toast.error(t('error.exportFailed'));
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    setBusy('import');
    try {
      const result = await pickBackup();
      if (result.status === 'canceled') return;
      if (result.status === 'invalid') {
        haptics.error();
        Alert.alert(t('error.importFailed'), `${t('settings.importInvalid')}\n\n(${result.reason})`);
        return;
      }
      const { counts, backup } = result.preview;
      Alert.alert(t('settings.importConfirm'), t('settings.importConfirmBody', counts), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            setBusy('import');
            try {
              await restoreBackup(backup);
              haptics.success();
              toast.success(t('settings.importSuccess'));
            } catch (e) {
              console.warn(e);
              toast.error(t('error.importFailed'));
            } finally {
              setBusy(null);
            }
          },
        },
      ]);
    } catch (e) {
      console.warn(e);
      toast.error(t('error.importFailed'));
    } finally {
      setBusy((b) => (b === 'import' ? null : b));
    }
  };

  const doClear = () =>
    Alert.alert(t('settings.clearConfirm'), t('settings.clearConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('settings.clearConfirmAgain'), undefined, [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('settings.clear'),
              style: 'destructive',
              onPress: async () => {
                setBusy('clear');
                try {
                  await clearAllData();
                  haptics.success();
                  toast.success(t('settings.cleared'));
                } catch {
                  toast.error(t('error.saveFailed'));
                } finally {
                  setBusy(null);
                }
              },
            },
          ]),
      },
    ]);

  const notificationsOn = settings.notificationsEnabled;

  return (
    <Screen back title={t('settings.title')} large>
      <SectionHeader title={t('settings.profile')} />
      <TextField
        value={name}
        onChangeText={setName}
        onBlur={() => name.trim() !== settings.userName && void set({ userName: name.trim() })}
        placeholder={t('settings.yourName')}
        label={t('settings.yourName')}
        maxLength={40}
        autoCapitalize="words"
      />

      <SectionHeader title={t('settings.appearance')} />
      <Card>
        <AppText variant="label" tone="secondary" style={styles.label}>
          {t('settings.theme')}
        </AppText>
        <SegmentedControl
          options={[
            { value: 'system', label: t('settings.theme.system') },
            { value: 'light', label: t('settings.theme.light') },
            { value: 'dark', label: t('settings.theme.dark') },
          ]}
          value={settings.theme}
          onChange={(theme) => void set({ theme })}
        />
        <AppText variant="label" tone="secondary" style={[styles.label, styles.spaced]}>
          {t('settings.language')}
        </AppText>
        <View style={styles.chips}>
          {LANGUAGES.map((l) => (
            <Chip key={l.value} label={l.label} selected={language === l.value} onPress={() => void changeLanguage(l.value)} />
          ))}
        </View>
        <AppText variant="label" tone="secondary" style={[styles.label, styles.spaced]}>
          {t('settings.weekStart')}
        </AppText>
        <View style={styles.chips}>
          {([1, 0, 6] as const).map((d) => (
            <Chip
              key={d}
              label={t(d === 1 ? 'weekday.monday' : d === 0 ? 'weekday.sunday' : 'weekday.saturday')}
              selected={settings.weekStartsOn === d}
              onPress={() => void set({ weekStartsOn: d })}
            />
          ))}
        </View>
      </Card>

      <SectionHeader title={t('settings.notifications')} />
      <Card padded={false}>
        <View style={styles.inner}>
          <ListRow icon={Bell} title={t('settings.notificationsEnabled')} switchValue={notificationsOn} onSwitch={(v) => void toggleNotifications(v)} />
          {notificationsOn && permission === 'denied' ? (
            <ListRow
              icon={TriangleAlert}
              iconColor={colors.warning}
              title={t('settings.permissionDenied')}
              subtitle={t('settings.openSystemSettings')}
              onPress={() => void Linking.openSettings()}
            />
          ) : null}
          <ListRow icon={BellRing} title={t('settings.taskReminders')} switchValue={settings.taskRemindersEnabled} disabled={!notificationsOn} onSwitch={(v) => void set({ taskRemindersEnabled: v }, true)} />
          <ListRow icon={CalendarClock} title={t('settings.deadlineAlerts')} subtitle={t('settings.deadlineAlertsHint')} switchValue={settings.deadlineAlertsEnabled} disabled={!notificationsOn} onSwitch={(v) => void set({ deadlineAlertsEnabled: v }, true)} />
          <ListRow icon={Flame} iconColor="#F97316" title={t('settings.habitReminders')} switchValue={settings.habitRemindersEnabled} disabled={!notificationsOn} onSwitch={(v) => void set({ habitRemindersEnabled: v }, true)} />
          <ListRow icon={Timer} iconColor="#14B8A6" title={t('settings.focusAlerts')} switchValue={settings.focusNotificationsEnabled} disabled={!notificationsOn} onSwitch={(v) => void set({ focusNotificationsEnabled: v })} last />
        </View>
      </Card>

      <SectionHeader title={t('settings.tasks')} />
      <Card>
        <AppText variant="label" tone="secondary" style={styles.label}>
          {t('settings.defaultPriority')}
        </AppText>
        <View style={styles.chips}>
          {PRIORITIES.map((p) => (
            <Chip key={p} label={t(`priority.${PRIORITY_KEYS[p]}`)} color={colors.priority[PRIORITY_KEYS[p]]} selected={settings.defaultPriority === p} onPress={() => void set({ defaultPriority: p })} />
          ))}
        </View>
        <AppText variant="label" tone="secondary" style={[styles.label, styles.spaced]}>
          {t('settings.defaultReminder')}
        </AppText>
        <View style={styles.chips}>
          <Chip label={t('common.none')} selected={settings.defaultReminder === null} onPress={() => void set({ defaultReminder: null })} size="sm" />
          {REMINDER_PRESETS.map((o) => (
            <Chip key={o} label={reminderLabel(o, t)} selected={settings.defaultReminder === o} onPress={() => void set({ defaultReminder: o })} size="sm" />
          ))}
        </View>
      </Card>
      <Card padded={false} style={styles.cardGap}>
        <View style={styles.inner}>
          <ListRow icon={Clock} title={t('settings.reminderTime')} value={formatTime(settings.defaultReminderTime, language)} onPress={() => setTimeSheet(true)} />
          <ListRow icon={Shapes} iconColor="#8B5CF6" title={t('categories.title')} onPress={() => router.push('/settings/categories')} />
          <ListRow icon={Vibrate} title={t('settings.haptics')} switchValue={settings.hapticsEnabled} onSwitch={(v) => void set({ hapticsEnabled: v })} last />
        </View>
      </Card>

      <SectionHeader title={t('settings.focus')} />
      <Card>
        <StepperRow label={t('settings.focusLength')} value={settings.focusMinutes} min={5} max={120} step={5} onChange={(v) => void set({ focusMinutes: v })} />
        <StepperRow label={t('settings.shortBreak')} value={settings.shortBreakMinutes} min={1} max={30} onChange={(v) => void set({ shortBreakMinutes: v })} />
        <StepperRow label={t('settings.longBreak')} value={settings.longBreakMinutes} min={5} max={60} step={5} onChange={(v) => void set({ longBreakMinutes: v })} />
        <StepperRow label={t('settings.sessionsBeforeLong')} value={settings.sessionsBeforeLongBreak} min={2} max={8} onChange={(v) => void set({ sessionsBeforeLongBreak: v })} unitless />
      </Card>

      <SectionHeader title={t('settings.data')} />
      <Card padded={false}>
        <View style={styles.inner}>
          <ListRow icon={Upload} iconColor="#22C55E" title={t('settings.export')} subtitle={t('settings.exportHint')} onPress={() => void doExport()} disabled={!!busy} />
          <ListRow icon={Download} iconColor="#0EA5E9" title={t('settings.import')} subtitle={t('settings.importHint')} onPress={() => void doImport()} disabled={!!busy} />
          <ListRow icon={Trash2} destructive title={t('settings.clear')} subtitle={t('settings.clearHint')} onPress={doClear} disabled={!!busy} last />
        </View>
      </Card>
      {busy ? <ActivityIndicator color={colors.primary} style={styles.busy} accessibilityLabel="Working" /> : null}

      <SectionHeader title={t('settings.about')} />
      <Card padded={false}>
        <View style={styles.inner}>
          <ListRow icon={Info} title="Orbit" value={`${t('settings.version')} ${Constants.expoConfig?.version ?? '1.0.0'}`} />
          <ListRow icon={HardDrive} title={t('settings.storage')} value={t('settings.storageValue')} />
          <ListRow icon={Database} title="SQLite" value="orbit.db" />
          <ListRow icon={Smartphone} title={t('settings.aboutBody')} last />
        </View>
      </Card>

      <Sheet visible={timeSheet} onClose={() => setTimeSheet(false)} title={t('settings.reminderTime')}>
        <TimePanel value={settings.defaultReminderTime} onChange={(v) => v && void set({ defaultReminderTime: v }, true)} allowClear={false} />
      </Sheet>
    </Screen>
  );
}

function StepperRow({ label, value, min, max, step = 1, onChange, unitless }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unitless?: boolean }) {
  return (
    <View style={styles.stepperRow}>
      <AppText variant="bodyMedium" style={styles.flex}>
        {label}
      </AppText>
      <Stepper label={label} value={value} min={min} max={max} step={step} onChange={onChange} format={unitless ? undefined : (v) => `${v} min`} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { marginBottom: spacing.sm },
  spaced: { marginTop: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  inner: { paddingHorizontal: spacing.lg },
  cardGap: { marginTop: spacing.md },
  stepperRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.md },
  busy: { marginTop: spacing.sm },
});
