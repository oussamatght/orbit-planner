import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';

import { darkTheme, lightTheme, type AppTheme } from './themes';

const ThemeContext = createContext<AppTheme>(lightTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const mode = useSettingsStore((s) => s.settings.theme);
  const theme = useMemo(() => {
    const dark = mode === 'system' ? system === 'dark' : mode === 'dark';
    return dark ? darkTheme : lightTheme;
  }, [mode, system]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}
