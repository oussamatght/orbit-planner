import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { radius, spacing, useTheme, withAlpha } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

interface Props {
  icon: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  color?: string;
  compact?: boolean;
}

/** Friendly illustrated empty state: layered halo around an icon, title, hint and optional action. */
export function EmptyState({ icon: Icon, title, message, actionLabel, onAction, color, compact }: Props) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  const size = compact ? 64 : 96;
  return (
    <Animated.View entering={FadeIn.duration(350)} style={[styles.root, compact && styles.compact]}>
      <View style={[styles.haloOuter, { width: size + 40, height: size + 40, backgroundColor: withAlpha(accent, 0.06) }]}>
        <View style={[styles.haloInner, { width: size, height: size, backgroundColor: withAlpha(accent, 0.14) }]}>
          <Icon size={size * 0.42} color={accent} strokeWidth={1.8} />
        </View>
      </View>
      <AppText variant={compact ? 'subheading' : 'heading'} align="center" style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" tone="secondary" align="center" style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="soft" style={styles.action} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingVertical: spacing.huge, paddingHorizontal: spacing.xxl },
  compact: { paddingVertical: spacing.xxl },
  haloOuter: { borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  haloInner: { borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  title: { marginBottom: spacing.xs },
  message: { maxWidth: 300 },
  action: { marginTop: spacing.lg },
});
