import { Brain, Coffee, Timer } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useLanguage, useT } from '@/i18n';
import { useFocusStore } from '@/store/focusStore';
import { useTaskStore } from '@/store/taskStore';
import { spacing } from '@/theme';
import type { DateKey } from '@/types/models';
import { formatDuration, isoToDateKey, locale } from '@/utils/date';
import { relativeDate } from '@/utils/format';

import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { ListRow } from '../ui/ListRow';
import { SectionHeader } from '../ui/SectionHeader';

import { MODE_COLORS, modeLabel } from './focusModes';

/** The most recent focus and break sessions, newest first. */
export function FocusHistory({ today, limit = 15 }: { today: DateKey; limit?: number }) {
  const t = useT();
  const language = useLanguage();
  const sessions = useFocusStore((s) => s.sessions);
  const tasks = useTaskStore((s) => s.tasks);
  const history = sessions.slice(0, limit);

  return (
    <View>
      <SectionHeader title={t('focus.history')} />
      {history.length === 0 ? (
        <EmptyState compact icon={Timer} title={t('focus.noHistory')} message={t('focus.noHistoryHint')} />
      ) : (
        <Card padded={false}>
          <View style={styles.inner}>
            {history.map((s, i) => {
              const task = tasks.find((x) => x.id === s.taskId);
              const time = new Date(s.startedAt).toLocaleTimeString(locale(language), { hour: 'numeric', minute: '2-digit' });
              return (
                <ListRow
                  key={s.id}
                  icon={s.mode === 'focus' ? Brain : Coffee}
                  iconColor={MODE_COLORS[s.mode][0]}
                  title={task?.title ?? modeLabel(s.mode, t)}
                  subtitle={`${relativeDate(isoToDateKey(s.startedAt), t, language, today)} · ${time}${s.completed ? '' : ` · ${t('focus.interrupted')}`}`}
                  value={formatDuration(s.actualSeconds)}
                  last={i === history.length - 1}
                />
              );
            })}
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ inner: { paddingHorizontal: spacing.lg } });
