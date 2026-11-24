export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primarySoft: string;
  primaryText: string;
  onPrimary: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  overlay: string;
  skeleton: string;
  tabBar: string;
  gradientStart: string;
  gradientEnd: string;
  noteText: string;
  priority: { low: string; medium: string; high: string; urgent: string };
}

export interface AppTheme {
  dark: boolean;
  colors: ThemeColors;
}

export const lightTheme: AppTheme = {
  dark: false,
  colors: {
    background: '#F6F7FB',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F2F8',
    surfaceElevated: '#FFFFFF',
    border: '#E7E9F1',
    borderStrong: '#D3D7E3',
    text: '#0F1222',
    textSecondary: '#5A6078',
    textTertiary: '#9499AE',
    primary: '#5B5BF6',
    primarySoft: '#EEF0FF',
    primaryText: '#4A44E0',
    onPrimary: '#FFFFFF',
    success: '#16A34A',
    successSoft: '#E7F8EE',
    warning: '#D97706',
    warningSoft: '#FEF3E2',
    danger: '#E5484D',
    dangerSoft: '#FDECEC',
    info: '#0EA5E9',
    overlay: 'rgba(10, 12, 24, 0.45)',
    skeleton: '#E9EBF2',
    tabBar: '#FFFFFF',
    gradientStart: '#6366F1',
    gradientEnd: '#8B5CF6',
    noteText: '#1F2333',
    priority: { low: '#8B5CF6', medium: '#0EA5E9', high: '#F59E0B', urgent: '#E11D48' },
  },
};

export const darkTheme: AppTheme = {
  dark: true,
  colors: {
    background: '#0B0D14',
    surface: '#151824',
    surfaceAlt: '#1C2030',
    surfaceElevated: '#1E2232',
    border: '#252A3B',
    borderStrong: '#343A50',
    text: '#F2F3F8',
    textSecondary: '#A3A8BD',
    textTertiary: '#6B7088',
    primary: '#7476FF',
    primarySoft: 'rgba(116, 118, 255, 0.16)',
    primaryText: '#A3A5FF',
    onPrimary: '#FFFFFF',
    success: '#34D399',
    successSoft: 'rgba(52, 211, 153, 0.14)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251, 191, 36, 0.14)',
    danger: '#F87171',
    dangerSoft: 'rgba(248, 113, 113, 0.14)',
    info: '#38BDF8',
    overlay: 'rgba(0, 0, 0, 0.6)',
    skeleton: '#1E2232',
    tabBar: '#151824',
    gradientStart: '#5B5BF6',
    gradientEnd: '#9333EA',
    noteText: '#1F2333',
    priority: { low: '#8B5CF6', medium: '#0284C7', high: '#D97706', urgent: '#E11D48' },
  },
};
