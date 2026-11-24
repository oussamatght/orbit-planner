import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/theme';

import { AppText } from './AppText';
import { IconButton } from './IconButton';

export const TAB_BAR_SPACE = 110;

interface HeaderProps {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  large?: boolean;
}

export function ScreenHeader({ title, subtitle, back, right, large }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {back ? (
          <IconButton
            icon={ChevronLeft}
            flipRTL
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityLabel="Back"
            variant="filled"
            size={22}
          />
        ) : null}
        {!large && title ? (
          <AppText variant="subheading" numberOfLines={1} style={styles.inlineTitle} accessibilityRole="header">
            {title}
          </AppText>
        ) : (
          <View style={styles.flex} />
        )}
        <View style={styles.right}>{right}</View>
      </View>
      {large && title ? (
        <View style={styles.large}>
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="body" tone="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

interface ScreenProps extends HeaderProps {
  children: ReactNode;
  scroll?: boolean;
  /** Extra bottom space for screens displayed above the floating tab bar. */
  tabBarSpace?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  header?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  footer?: ReactNode;
}

export function Screen({
  children,
  scroll = true,
  tabBarSpace,
  contentStyle,
  header = true,
  onRefresh,
  refreshing = false,
  footer,
  ...headerProps
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = (tabBarSpace ? TAB_BAR_SPACE : spacing.xxxl) + insets.bottom;
  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {header ? <ScreenHeader {...headerProps} /> : null}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottom }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing.sm },
  inlineTitle: { flex: 1, textAlign: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 44, justifyContent: 'flex-end' },
  large: { paddingHorizontal: spacing.xs, paddingTop: spacing.xs, paddingBottom: spacing.md, gap: 2 },
  content: { paddingHorizontal: spacing.lg },
});
