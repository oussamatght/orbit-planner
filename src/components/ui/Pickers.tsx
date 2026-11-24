import { Check, Minus, Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from './AppIcon';

import { ICON_KEYS } from '@/constants/icons';
import { ACCENT_COLORS, radius, spacing, useTheme, withAlpha } from '@/theme';
import { haptics } from '@/utils/haptics';

import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { PressableScale } from './PressableScale';

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {ACCENT_COLORS.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase();
        return (
          <PressableScale
            key={color}
            onPress={() => {
              haptics.selection();
              onChange(color);
            }}
            pressedScale={0.88}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`Color ${color}`}
            style={[styles.swatch, { backgroundColor: color, borderColor: selected ? withAlpha(color, 0.35) : 'transparent' }]}
          >
            {selected ? <Check size={18} color="#FFFFFF" strokeWidth={3} /> : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

export function IconPicker({ value, onChange, color }: { value: string; onChange: (icon: string) => void; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {ICON_KEYS.map((key) => {
        const selected = key === value;
        return (
          <PressableScale
            key={key}
            onPress={() => {
              haptics.selection();
              onChange(key);
            }}
            pressedScale={0.88}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`Icon ${key}`}
            style={[
              styles.iconTile,
              {
                backgroundColor: selected ? withAlpha(color, 0.16) : colors.surfaceAlt,
                borderColor: selected ? color : 'transparent',
              },
            ]}
          >
            <AppIcon name={key} size={20} color={selected ? color : colors.textSecondary} />
          </PressableScale>
        );
      })}
    </View>
  );
}

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  label: string;
}

export function Stepper({ value, onChange, min, max, step = 1, format, label }: StepperProps) {
  const { colors } = useTheme();
  const set = (v: number) => {
    const next = Math.min(max, Math.max(min, v));
    if (next !== value) {
      haptics.selection();
      onChange(next);
    }
  };
  return (
    <View style={[styles.stepper, { backgroundColor: colors.surfaceAlt }]} accessibilityLabel={label} accessibilityValue={{ min, max, now: value }}>
      <IconButton icon={Minus} onPress={() => set(value - step)} disabled={value <= min} accessibilityLabel={`Decrease ${label}`} size={18} />
      <AppText variant="subheading" style={styles.stepperValue}>
        {format ? format(value) : value}
      </AppText>
      <IconButton icon={Plus} onPress={() => set(value + step)} disabled={value >= max} accessibilityLabel={`Increase ${label}`} size={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 4 },
  iconTile: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, alignSelf: 'flex-start' },
  stepperValue: { minWidth: 64, textAlign: 'center' },
});
