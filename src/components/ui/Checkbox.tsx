import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme';

interface Props {
  checked: boolean;
  onToggle: () => void;
  color?: string;
  size?: number;
  rounded?: boolean;
  accessibilityLabel: string;
}

/** Animated checkbox: fills with the accent color and "pops" when checked. */
export function Checkbox({ checked, onToggle, color, size = 24, rounded = true, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 180 });
    if (checked) scale.value = withSequence(withSpring(1.18, { damping: 8, stiffness: 400 }), withSpring(1));
  }, [checked, progress, scale]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', accent]),
    borderColor: interpolateColor(progress.value, [0, 1], [accent, accent]),
    transform: [{ scale: scale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: 0.6 + progress.value * 0.4 }] }));

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[styles.box, { width: size, height: size, borderRadius: rounded ? size / 2 : size * 0.3 }, boxStyle]}
      >
        <Animated.View style={checkStyle}>
          <Check size={size * 0.62} color="#FFFFFF" strokeWidth={3.2} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
