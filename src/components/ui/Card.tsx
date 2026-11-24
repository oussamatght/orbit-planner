import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, shadow, spacing, useTheme } from '@/theme';

import { PressableScale } from './PressableScale';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  padded?: boolean;
  accessibilityLabel?: string;
}

export function Card({ children, style, onPress, onLongPress, padded = true, accessibilityLabel }: Props) {
  const { colors, dark } = useTheme();
  const base = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      padding: padded ? spacing.lg : 0,
    },
    !dark && shadow(1),
    style,
  ];
  if (onPress || onLongPress) {
    return (
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={accessibilityLabel}
        pressedScale={0.985}
        style={base}
      >
        {children}
      </PressableScale>
    );
  }
  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
});
