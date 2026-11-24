import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { spacing, useTheme } from '@/theme';

import { AppText } from '../ui/AppText';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Full label for the tooltip / screen readers. */
  longLabel?: string;
}

interface Props {
  data: BarDatum[];
  height?: number;
  color: string;
  /** Formats values for the tooltip and the max gridline. */
  format?: (value: number) => string;
  /** Show every Nth x-axis label to avoid collisions. */
  labelEvery?: number;
  highlightKey?: string;
}

/** Rounded-top path for a bar anchored to the baseline (square bottom, 4px radius on top). */
function barPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/**
 * Single-series bar chart: one hue, thin bars with 2px+ gaps, recessive baseline and one max gridline.
 * Tapping a bar reveals its value (the touch equivalent of hover); the latest or highlighted bar is emphasised.
 */
export function BarChart({ data, height = 150, color, format = (v) => String(v), labelEvery = 1, highlightKey }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const chartH = height - 22;
  const slot = data.length ? width / data.length : 0;
  const barW = Math.max(4, Math.min(28, slot * 0.58));
  const shown = data.find((d) => d.key === active) ?? null;
  const emphasis = active ?? highlightKey ?? data[data.length - 1]?.key;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="image" accessibilityLabel={data.map((d) => `${d.longLabel ?? d.label}: ${format(d.value)}`).join(', ')}>
      <View style={styles.tooltipRow}>
        <AppText variant="caption" tone="tertiary">
          {shown ? (shown.longLabel ?? shown.label) : `max ${format(max)}`}
        </AppText>
        {shown ? <AppText variant="label">{format(shown.value)}</AppText> : null}
      </View>
      {width > 0 ? (
        <View style={{ height }}>
          <Svg width={width} height={chartH}>
            <Line x1={0} x2={width} y1={1} y2={1} stroke={colors.border} strokeDasharray="3 4" strokeWidth={1} />
            <Line x1={0} x2={width} y1={chartH - 0.5} y2={chartH - 0.5} stroke={colors.borderStrong} strokeWidth={1} />
            {data.map((d, i) => {
              const h = d.value > 0 ? Math.max(3, (d.value / max) * (chartH - 6)) : 0;
              const x = i * slot + (slot - barW) / 2;
              const on = d.key === emphasis;
              return h > 0 ? (
                <Path key={d.key} d={barPath(x, chartH - 1 - h, barW, h, 4)} fill={color} opacity={on ? 1 : 0.42} />
              ) : null;
            })}
          </Svg>
          {/* Hit targets larger than the marks: the full column for each bar. */}
          <View style={[StyleSheet.absoluteFill, styles.hits]}>
            {data.map((d) => (
              <Pressable
                key={d.key}
                style={styles.hit}
                onPress={() => setActive((cur) => (cur === d.key ? null : d.key))}
                accessibilityRole="button"
                accessibilityLabel={`${d.longLabel ?? d.label}: ${format(d.value)}`}
              />
            ))}
          </View>
          <View style={styles.labels}>
            {data.map((d, i) => (
              <View key={d.key} style={styles.labelCell}>
                {i % labelEvery === 0 || i === data.length - 1 ? (
                  <AppText variant="caption" tone={d.key === emphasis ? 'primary' : 'tertiary'} numberOfLines={1} style={styles.label}>
                    {d.label}
                  </AppText>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm, minHeight: 18 },
  hits: { flexDirection: 'row', bottom: 22 },
  hit: { flex: 1 },
  labels: { flexDirection: 'row', marginTop: 4 },
  labelCell: { flex: 1, alignItems: 'center' },
  label: { fontSize: 10 },
});
