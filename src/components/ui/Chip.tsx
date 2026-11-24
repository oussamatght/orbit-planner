import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme, withAlpha } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  icon?: LucideIcon;
  color?: string;
  dot?: string;
  size?: 'sm' | 'md';
  accessibilityLabel?: string;
}

export function Chip({ label, selected, onPress, onLongPress, icon: Icon, color, dot, size = 'md', accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  const bg = selected ? withAlpha(accent, 0.14) : colors.surface;
  const border = selected ? withAlpha(accent, 0.5) : colors.border;
  const fg = selected ? (color ?? colors.primaryText) : colors.textSecondary;
  const content = (
    <>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      {Icon ? <Icon size={size === 'sm' ? 13 : 15} color={fg} strokeWidth={2.2} /> : null}
      <AppText variant={size === 'sm' ? 'caption' : 'label'} color={fg} numberOfLines={1}>
        {label}
      </AppText>
    </>
  );
  const style = [
    styles.chip,
    { backgroundColor: bg, borderColor: border, height: size === 'sm' ? 28 : 36, paddingHorizontal: size === 'sm' ? 10 : 14 },
  ];
  if (!onPress && !onLongPress) return <View style={style}>{content}</View>;
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      pressedScale={0.94}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected }}
      style={style}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
