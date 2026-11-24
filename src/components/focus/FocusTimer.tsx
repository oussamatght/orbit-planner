import { Brain, Coffee, Pause, Play, RotateCcw, SkipForward, Sofa } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { ensurePermission } from '@/services/notificationService';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { fonts, shadow, spacing, useTheme } from '@/theme';
import { formatClock } from '@/utils/date';
import { haptics } from '@/utils/haptics';

import { AppText } from '../ui/AppText';
import { IconButton } from '../ui/IconButton';
import { PressableScale } from '../ui/PressableScale';
import { ProgressRing } from '../ui/ProgressRing';

import { MODE_COLORS, modeLabel } from './focusModes';

/**
 * The Pomodoro dial and its controls. It owns the display tick, so only this component
 * re-renders while the timer runs (the store keeps the authoritative end timestamp).
 */
export function FocusTimer() {
  const t = useT();
  const { colors } = useTheme();
  const mode = useFocusStore((s) => s.mode);
  const status = useFocusStore((s) => s.status);
  const durationSeconds = useFocusStore((s) => s.durationSeconds);
  const completedFocusCount = useFocusStore((s) => s.completedFocusCount);
  const { start, pause, reset, skip, remaining } = useFocusStore.getState();
  const sessionsBeforeLongBreak = useSettingsStore((s) => s.settings.sessionsBeforeLongBreak);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (status !== 'running') return;
    const interval = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(interval);
  }, [status]);

  const left = remaining();
  const progress = durationSeconds ? 1 - left / durationSeconds : 0;
  const [c1, c2] = MODE_COLORS[mode];
  const untilLong = sessionsBeforeLongBreak - (completedFocusCount % sessionsBeforeLongBreak);
  const ModeIcon = mode === 'focus' ? Brain : mode === 'short_break' ? Coffee : Sofa;

  const onPrimary = async () => {
    if (status === 'running') {
      await pause();
      haptics.light();
      return;
    }
    haptics.medium();
    await ensurePermission();
    await start();
  };

  return (
    <View>
      <View style={styles.timerWrap}>
        <ProgressRing progress={progress} size={260} strokeWidth={16} color={c1} colorEnd={c2} trackColor={colors.surfaceAlt}>
          <View style={styles.center}>
            <ModeIcon size={22} color={c1} />
            <AppText style={[styles.clock, { color: colors.text }]} accessibilityLabel={`${Math.ceil(left / 60)} min`} accessibilityLiveRegion="polite">
              {formatClock(left)}
            </AppText>
            <AppText variant="caption" tone="tertiary">
              {mode === 'focus' ? t('focus.untilLongBreak', { count: untilLong }) : modeLabel(mode, t)}
            </AppText>
          </View>
        </ProgressRing>
      </View>

      <View style={styles.controls}>
        <IconButton
          icon={RotateCcw}
          onPress={() => {
            haptics.light();
            void reset();
          }}
          accessibilityLabel={t('focus.reset')}
          variant="filled"
          disabled={status === 'idle'}
        />
        <PressableScale
          onPress={() => void onPrimary()}
          pressedScale={0.92}
          accessibilityLabel={status === 'running' ? t('focus.pause') : status === 'paused' ? t('focus.resume') : t('focus.start')}
          style={[styles.playBtn, { backgroundColor: c1 }, shadow(3, c1)]}
        >
          {status === 'running' ? <Pause size={32} color="#FFF" fill="#FFF" /> : <Play size={32} color="#FFF" fill="#FFF" style={styles.playIcon} />}
        </PressableScale>
        <IconButton
          icon={SkipForward}
          onPress={() => {
            haptics.light();
            void skip();
          }}
          accessibilityLabel={t('focus.skip')}
          variant="filled"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timerWrap: { alignItems: 'center', marginVertical: spacing.xxl },
  center: { alignItems: 'center', gap: spacing.xs },
  clock: { fontFamily: fonts.extrabold, fontSize: 58, lineHeight: 66, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xxl },
  playBtn: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 4 },
});
