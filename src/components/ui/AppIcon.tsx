import { createElement } from 'react';

import { iconFor } from '@/constants/icons';

interface Props {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Renders a user-selectable icon by its persisted key (see `constants/icons`). */
export function AppIcon({ name, size = 20, color, strokeWidth = 2 }: Props) {
  return createElement(iconFor(name), { size, color, strokeWidth });
}
