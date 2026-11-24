/** Colors users can choose for projects, habits, notebooks, tags and categories. */
export const ACCENT_COLORS = [
  '#5B5BF6',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#FB7A3C',
  '#F5A524',
  '#22C55E',
  '#14B8A6',
  '#0EA5E9',
  '#64748B',
] as const;

/** Soft paper tints for notes. `null` means the default surface color. */
export const NOTE_COLORS = [null, '#FDE68A', '#BBF7D0', '#BFDBFE', '#FBCFE8', '#DDD6FE', '#FED7AA'] as const;

/** Adds alpha to a #RRGGBB color. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean}${a}`;
}
