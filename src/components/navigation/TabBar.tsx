import type { BottomTabBarProps } from 'expo-router/tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, Flame, LayoutGrid, NotebookPen, Plus, Sun, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT, type TranslationKey } from '@/i18n';
import { useUiStore } from '@/store/uiStore';
import { radius, shadow, spacing, useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

const TABS: Record<string, { icon: LucideIcon; label: TranslationKey }> = {
  index: { icon: Sun, label: 'tabs.today' },
  calendar: { icon: CalendarDays, label: 'tabs.calendar' },
  notes: { icon: NotebookPen, label: 'tabs.notes' },
  habits: { icon: Flame, label: 'tabs.habits' },
  more: { icon: LayoutGrid, label: 'tabs.more' },
};

function TabItem({ focused, icon: Icon, label, onPress, onLongPress }: { focused: boolean; icon: LucideIcon; label: string; onPress: () => void; onLongPress: () => void }) {
  const { colors } = useTheme();
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [focused, progress]);
  const pill = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scaleX: 0.6 + progress.value * 0.4 }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -progress.value * 1 }, { scale: 1 + progress.value * 0.06 }] }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, { backgroundColor: colors.primarySoft }, pill]} />
        <Animated.View style={iconStyle}>
          <Icon size={22} color={focused ? colors.primary : colors.textTertiary} strokeWidth={focused ? 2.4 : 2} />
        </Animated.View>
      </View>
      <AppText variant="caption" color={focused ? colors.primaryText : colors.textTertiary} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Floating tab bar with an animated pill indicator and a raised quick-add button. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);

  const routes = state.routes.filter((r) => TABS[r.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === index;
    const config = TABS[route.name];
    return (
      <TabItem
        key={route.key}
        focused={focused}
        icon={config.icon}
        label={t(config.label)}
        onPress={() => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptics.selection();
            navigateToTab(route.key);
          }
        }}
        onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: colors.tabBar, borderColor: colors.border }, shadow(3, dark ? '#000' : '#1E2350')]}>
        {left.map(renderTab)}
        <View style={styles.fabSlot}>
          <PressableScale
            onPress={() => {
              haptics.medium();
              openQuickAdd();
            }}
            pressedScale={0.9}
            accessibilityLabel={t('task.new')}
            style={[styles.fab, shadow(2, colors.primary)]}
          >
            <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabInner}>
              <Plus size={26} color="#FFFFFF" strokeWidth={2.6} />
            </LinearGradient>
          </PressableScale>
        </View>
        {right.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    height: 70,
    paddingHorizontal: spacing.xs,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 },
  iconWrap: { width: 52, height: 30, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.full },
  label: { fontSize: 11 },
  fabSlot: { width: 68, alignItems: 'center' },
  fab: { width: 54, height: 54, borderRadius: 18, marginTop: -26 },
  fabInner: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
