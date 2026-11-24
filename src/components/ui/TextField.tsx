import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { fonts, radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

interface Props extends TextInputProps {
  ref?: Ref<TextInputInstance>;
  label?: string;
  error?: string | null;
  hint?: string;
}

export function TextField({ label, error, hint, style, multiline, onFocus, onBlur, ref, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" tone="secondary" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        multiline={multiline}
        accessibilityLabel={label ?? rest.placeholder}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surfaceAlt,
            borderColor: error ? colors.danger : focused ? colors.primary : 'transparent',
            minHeight: multiline ? 96 : 50,
            textAlignVertical: multiline ? 'top' : 'center',
            paddingTop: multiline ? spacing.md : undefined,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" tone="danger" style={styles.helper} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="tertiary" style={styles.helper}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.xs + 2 },
  input: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  helper: { marginTop: spacing.xs },
});
