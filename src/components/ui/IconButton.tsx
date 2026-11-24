import type { LucideIcon } from 'lucide-react-native';
import { I18nManager, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { HIT_SIZE, radius, useTheme } from '@/theme';

import { PressableScale } from './PressableScale';

interface Props {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'plain' | 'filled' | 'soft' | 'primary';
  color?: string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Mirror the icon in right-to-left layouts (for arrows and chevrons). */
  flipRTL?: boolean;
}

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  variant = 'plain',
  color,
  size = 20,
  disabled,
  style,
  flipRTL,
}: Props) {
  const { colors } = useTheme();
  const bg = { plain: 'transparent', filled: colors.surface, soft: colors.surfaceAlt, primary: colors.primary }[variant];
  const fg = color ?? (variant === 'primary' ? colors.onPrimary : colors.text);
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      pressedScale={0.9}
      style={[
        styles.base,
        { backgroundColor: bg, opacity: disabled ? 0.4 : 1 },
        variant === 'filled' && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
        style,
      ]}
    >
      <View style={flipRTL && I18nManager.isRTL ? styles.mirror : undefined}>
        <Icon size={size} color={fg} strokeWidth={2.1} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  mirror: { transform: [{ scaleX: -1 }] },
  base: { width: HIT_SIZE, height: HIT_SIZE, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
