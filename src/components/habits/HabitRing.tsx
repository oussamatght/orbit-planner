import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from '../ui/AppIcon';

import { useTheme, withAlpha } from '@/theme';
import type { Habit } from '@/types/models';

import { AppText } from '../ui/AppText';
import { PressableScale } from '../ui/PressableScale';
import { ProgressRing } from '../ui/ProgressRing';

interface Props {
  habit: Habit;
  count: number;
  onPress: () => void;
  onLongPress?: () => void;
  size?: number;
  disabled?: boolean;
}

/** Tappable progress ring for a habit's daily check-ins. Shows the icon, a count, or a check when done. */
export function HabitRing({ habit, count, onPress, onLongPress, size = 52, disabled }: Props) {
  const { colors } = useTheme();
  const done = count >= habit.targetPerDay;
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      pressedScale={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}: ${count} / ${habit.targetPerDay}`}
      accessibilityState={{ checked: done, disabled }}
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <ProgressRing
        progress={count / habit.targetPerDay}
        size={size}
        strokeWidth={size > 48 ? 5 : 4}
        color={habit.color}
        trackColor={withAlpha(habit.color, 0.16)}
      >
        <View style={[styles.inner, { width: size - 14, height: size - 14, borderRadius: size, backgroundColor: done ? habit.color : 'transparent' }]}>
          {done ? (
            <Check size={size * 0.38} color="#FFFFFF" strokeWidth={3} />
          ) : habit.targetPerDay > 1 && count > 0 ? (
            <AppText variant="label" color={habit.color}>
              {count}
            </AppText>
          ) : (
            <AppIcon name={habit.icon} size={size * 0.36} color={count > 0 ? habit.color : colors.textSecondary} strokeWidth={2.1} />
          )}
        </View>
      </ProgressRing>
    </PressableScale>
  );
}

const styles = StyleSheet.create({ inner: { alignItems: 'center', justifyContent: 'center' } });
