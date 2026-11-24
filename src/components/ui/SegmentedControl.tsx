import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { haptics } from '@/utils/haptics';
import { radius, shadow, useTheme } from '@/theme';

import { AppText } from './AppText';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** iOS-style segmented control with a sliding thumb. */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors, dark } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width > 0 ? (width - 6) / options.length : 0;

  const thumb = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: withSpring(index * segment, { damping: 22, stiffness: 260 }) }],
  }));

  return (
    <View
      style={[styles.root, { backgroundColor: colors.surfaceAlt }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {segment > 0 ? (
        <Animated.View style={[styles.thumb, { backgroundColor: dark ? colors.surfaceElevated : colors.surface }, !dark && shadow(1), thumb]} />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={styles.item}
            onPress={() => {
              if (!active) {
                haptics.selection();
                onChange(o.value);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <AppText variant="label" color={active ? colors.text : colors.textSecondary} numberOfLines={1}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', borderRadius: radius.md, padding: 3, height: 40 },
  thumb: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: radius.sm },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
