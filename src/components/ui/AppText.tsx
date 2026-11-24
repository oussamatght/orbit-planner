import { StyleSheet, Text, type TextProps } from 'react-native';

import { useLanguage } from '@/i18n';

import { typography, useTheme, type TypographyVariant } from '@/theme';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'success' | 'inverse';

interface Props extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function AppText({ variant = 'body', tone = 'primary', color, align, style, ...rest }: Props) {
  const { colors } = useTheme();
  // Arabic is a connected script: no letter-spacing, and a little more line height for Cairo.
  const arabic = useLanguage() === 'ar';
  const base = typography[variant];
  const toneColor = {
    primary: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    accent: colors.primaryText,
    danger: colors.danger,
    success: colors.success,
    inverse: colors.onPrimary,
  }[tone];
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        base,
        arabic && { lineHeight: Math.round((base.lineHeight ?? 20) * 1.18) },
        { color: color ?? toneColor, textAlign: align },
        style,
        arabic && styles.noTracking,
      ]}
    />
  );
}

const styles = StyleSheet.create({ noTracking: { letterSpacing: 0 } });
