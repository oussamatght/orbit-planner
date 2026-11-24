import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface Props {
  title: string;
  count?: number;
  actionLabel?: string;
  onAction?: () => void;
  color?: string;
}

export function SectionHeader({ title, count, actionLabel, onAction, color }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
        <AppText variant="subheading" accessibilityRole="header">
          {title}
        </AppText>
        {count !== undefined ? (
          <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
            <AppText variant="caption" tone="secondary">
              {count}
            </AppText>
          </View>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} hitSlop={10} accessibilityLabel={actionLabel}>
          <AppText variant="label" tone="accent">
            {actionLabel}
          </AppText>
        </PressableScale>
      ) : actionLabel ? (
        <AppText variant="label" tone="secondary">
          {actionLabel}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xxl, marginBottom: spacing.md },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
});
