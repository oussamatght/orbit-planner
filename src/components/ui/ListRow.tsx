import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { I18nManager, StyleSheet, Switch, View } from 'react-native';

import { radius, spacing, useTheme, withAlpha } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface Props {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  switchValue?: boolean;
  onSwitch?: (value: boolean) => void;
  destructive?: boolean;
  disabled?: boolean;
  last?: boolean;
}

/** Settings-style row: tinted icon tile, title/subtitle, and a value, switch or chevron. */
export function ListRow({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  value,
  onPress,
  right,
  switchValue,
  onSwitch,
  destructive,
  disabled,
  last,
}: Props) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : (iconColor ?? colors.primary);
  const content = (
    <View style={[styles.row, !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      {Icon ? (
        <View style={[styles.icon, { backgroundColor: withAlpha(tint, 0.14) }]}>
          <Icon size={18} color={tint} strokeWidth={2.1} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="bodyMedium" color={destructive ? colors.danger : colors.text} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="tertiary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="label" tone="secondary" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {right}
      {onSwitch ? (
        <Switch
          value={!!switchValue}
          onValueChange={onSwitch}
          disabled={disabled}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          thumbColor="#FFFFFF"
          accessibilityLabel={title}
        />
      ) : onPress ? (
        <View style={I18nManager.isRTL ? styles.mirror : undefined}>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      ) : null}
    </View>
  );
  if (!onPress || onSwitch) return content;
  return (
    <PressableScale onPress={onPress} disabled={disabled} pressedScale={0.99} accessibilityLabel={title} accessibilityHint={subtitle}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  mirror: { transform: [{ scaleX: -1 }] },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 58, gap: spacing.md, paddingVertical: spacing.sm },
  icon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  value: { maxWidth: 150 },
});
