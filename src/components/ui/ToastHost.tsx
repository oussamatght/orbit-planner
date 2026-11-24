import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUiStore, type Toast } from '@/store/uiStore';
import { radius, shadow, spacing } from '@/theme';

import { AppText } from './AppText';

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((s) => s.dismissToast);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, dismiss]);

  const Icon = toast.kind === 'error' ? CircleAlert : toast.kind === 'info' ? Info : CircleCheck;
  const iconColor = toast.kind === 'error' ? '#F87171' : toast.kind === 'info' ? '#93C5FD' : '#4ADE80';

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOutDown.duration(160)}
      layout={LinearTransition.springify()}
      style={[styles.toast, shadow(3)]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Icon size={18} color={iconColor} />
      <AppText variant="label" color="#F5F6FA" style={styles.message} numberOfLines={2}>
        {toast.message}
      </AppText>
      {toast.actionLabel && toast.onAction ? (
        <Pressable
          hitSlop={12}
          onPress={() => {
            toast.onAction?.();
            dismiss(toast.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={toast.actionLabel}
          style={styles.action}
        >
          <AppText variant="label" color="#A5B4FC">
            {toast.actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

/** Renders the toast queue above the tab bar. Mounted once at the root. */
export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 96 }]}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: spacing.lg, right: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#1B1E2B',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
    width: '100%',
    maxWidth: 480,
  },
  message: { flex: 1 },
  action: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
});
