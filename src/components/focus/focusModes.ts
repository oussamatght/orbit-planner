import type { TFunction } from '@/i18n';
import type { FocusMode } from '@/types/models';

/** Gradient colors for each timer mode: [start, end]. */
export const MODE_COLORS: Record<FocusMode, [string, string]> = {
  focus: ['#6366F1', '#8B5CF6'],
  short_break: ['#14B8A6', '#22C55E'],
  long_break: ['#0EA5E9', '#6366F1'],
};

export function modeLabel(mode: FocusMode, t: TFunction): string {
  if (mode === 'focus') return t('focus.focus');
  if (mode === 'short_break') return t('focus.shortBreak');
  return t('focus.longBreak');
}
