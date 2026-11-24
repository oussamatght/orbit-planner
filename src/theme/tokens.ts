import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 999,
} as const;

/**
 * Font aliases. `theme/fontLoader.ts` registers them at startup with Plus Jakarta Sans (Latin)
 * or Cairo (Arabic), so every screen gets the right script without code changes.
 */
export const fonts = {
  regular: 'App-Regular',
  medium: 'App-Medium',
  semibold: 'App-SemiBold',
  bold: 'App-Bold',
  extrabold: 'App-ExtraBold',
} as const;

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyMedium'
  | 'label'
  | 'caption'
  | 'overline';

export const typography: Record<TypographyVariant, TextStyle> = {
  display: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 25, letterSpacing: -0.3 },
  subheading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1 },
};

export function shadow(level: 1 | 2 | 3, color = '#0F172A'): ViewStyle {
  const map = {
    1: { y: 1, blur: 3, opacity: 0.06, elevation: 1 },
    2: { y: 4, blur: 12, opacity: 0.08, elevation: 3 },
    3: { y: 10, blur: 24, opacity: 0.16, elevation: 10 },
  } as const;
  const s = map[level];
  return Platform.select<ViewStyle>({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: s.y }, shadowOpacity: s.opacity, shadowRadius: s.blur },
    default: { elevation: s.elevation, shadowColor: color },
  });
}

/** Minimum touch target recommended by both platform guidelines. */
export const HIT_SIZE = 44;
