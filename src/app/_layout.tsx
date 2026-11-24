import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, LocaleProvider, router, Stack, ThemeProvider as NavigationThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { DatabaseZap, TriangleAlert } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QuickAddSheet } from '@/components/tasks/QuickAddSheet';
import { AppText, Button, EmptyState, SkeletonScreen, ToastHost } from '@/components/ui';
import { useFocusTicker } from '@/hooks/useFocusTicker';
import { useT } from '@/i18n';
import { initializeApp } from '@/services/bootstrap';
import { syncLayoutDirection } from '@/services/languageService';
import { useSettingsStore } from '@/store/settingsStore';
import { loadAppFonts } from '@/theme/fontLoader';
import { ThemeProvider, spacing, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

type BootState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

function useNotificationNavigation(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data as Record<string, unknown> | undefined;
      if (!data) return;
      if (typeof data.taskId === 'string') router.push({ pathname: '/tasks/[id]', params: { id: data.taskId } });
      else if (typeof data.habitId === 'string') router.push({ pathname: '/habits/[id]', params: { id: data.habitId } });
      else if (data.kind === 'focus') router.push('/focus');
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) open(last);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [enabled]);
}

function AppShell({ boot, retry }: { boot: BootState; retry: () => void }) {
  const theme = useTheme();
  const t = useT();
  useFocusTicker();
  useNotificationNavigation(boot.status === 'ready');

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, [theme.colors.background]);

  const navTheme = useMemo(() => {
    const base = theme.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        primary: theme.colors.primary,
      },
    };
  }, [theme]);

  if (boot.status === 'loading') return <SkeletonScreen />;
  if (boot.status === 'error') {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <EmptyState icon={DatabaseZap} title={t('error.dbTitle')} message={t('error.dbBody')} color={theme.colors.danger} />
        <AppText variant="caption" tone="tertiary" align="center" style={styles.detail}>
          {boot.message}
        </AppText>
        <Button label={t('common.retry')} onPress={retry} />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <LocaleProvider direction={I18nManager.isRTL ? 'rtl' : 'ltr'}>
        <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="projects/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="habits/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
      </LocaleProvider>
      <QuickAddSheet />
      <ToastHost />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [boot, setBoot] = useState<BootState>({ status: 'loading' });

  const run = useCallback(
    () =>
      initializeApp()
        .then(async () => {
          const { language } = useSettingsStore.getState().settings;
          // Keep the native direction in line with the app language (applies from the next launch).
          syncLayoutDirection(language);
          // A font that fails to load falls back to the system font rather than blocking startup.
          await loadAppFonts(language).catch((e: unknown) => console.warn('[fonts]', e));
          setBoot({ status: 'ready' });
        })
        .catch((error: unknown) => {
          console.error('[boot]', error);
          setBoot({ status: 'error', message: error instanceof Error ? error.message : String(error) });
        }),
    [],
  );
  const retry = useCallback(() => {
    setBoot({ status: 'loading' });
    void run();
  }, [run]);

  useEffect(() => {
    void run();
  }, [run]);

  useEffect(() => {
    if (boot.status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [boot.status]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppShell boot={boot} retry={retry} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Shown by Expo Router if a screen throws during render. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorView message={error.message} retry={retry} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ErrorView({ message, retry }: { message: string; retry: () => Promise<void> }) {
  const { colors } = useTheme();
  const t = useT();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <EmptyState icon={TriangleAlert} title={t('error.screenTitle')} message={message} color={colors.warning} />
      <Button label={t('common.retry')} onPress={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  detail: { marginBottom: spacing.lg, maxWidth: 320 },
});
