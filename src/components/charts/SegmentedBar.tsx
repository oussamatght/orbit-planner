import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme';

import { AppText } from '../ui/AppText';

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Part-to-whole bar with 2px surface gaps between segments, plus a legend that always shows
 * label and count in text ink (identity never relies on color alone).
 */
export function SegmentedBar({ segments, height = 14 }: { segments: Segment[]; height?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  return (
    <View accessibilityRole="image" accessibilityLabel={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
      <View style={[styles.bar, { height }]}>
        {visible.map((s, i) => (
          <View
            key={s.key}
            style={{
              flex: s.value,
              backgroundColor: s.color,
              marginLeft: i === 0 ? 0 : 2,
              borderTopLeftRadius: i === 0 ? radius.xs : 0,
              borderBottomLeftRadius: i === 0 ? radius.xs : 0,
              borderTopRightRadius: i === visible.length - 1 ? radius.xs : 0,
              borderBottomRightRadius: i === visible.length - 1 ? radius.xs : 0,
            }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {segments.map((s) => (
          <View key={s.key} style={styles.item}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <AppText variant="caption" tone="secondary">
              {s.label}
            </AppText>
            <AppText variant="label">{s.value}</AppText>
            {total ? (
              <AppText variant="caption" tone="tertiary">
                {Math.round((s.value / total) * 100)}%
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', width: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.sm, marginTop: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
