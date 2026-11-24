import { create } from 'zustand';

import type { DateKey } from '@/types/models';
import { createId } from '@/utils/id';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
}

export interface QuickAddDefaults {
  dueDate?: DateKey | null;
  projectId?: string | null;
  startTime?: string | null;
}

interface UiState {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id' | 'durationMs' | 'kind'> & { kind?: ToastKind; durationMs?: number }) => string;
  dismissToast: (id: string) => void;

  quickAddOpen: boolean;
  /** Incremented on every open so the form remounts with fresh state. */
  quickAddSession: number;
  quickAddDefaults: QuickAddDefaults;
  openQuickAdd: (defaults?: QuickAddDefaults) => void;
  closeQuickAdd: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  showToast: ({ kind = 'success', durationMs, ...rest }) => {
    const id = createId();
    const toast: Toast = { id, kind, durationMs: durationMs ?? (rest.onAction ? 5000 : 2600), ...rest };
    // Keep at most two visible; the newest replaces older ones.
    set((s) => ({ toasts: [...s.toasts.slice(-1), toast] }));
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  quickAddOpen: false,
  quickAddSession: 0,
  quickAddDefaults: {},
  openQuickAdd: (defaults = {}) => set((s) => ({ quickAddOpen: true, quickAddDefaults: defaults, quickAddSession: s.quickAddSession + 1 })),
  closeQuickAdd: () => set({ quickAddOpen: false }),
}));

export const toast = {
  success: (message: string, action?: { label: string; onPress: () => void }) =>
    useUiStore.getState().showToast({ message, kind: 'success', actionLabel: action?.label, onAction: action?.onPress }),
  error: (message: string) => useUiStore.getState().showToast({ message, kind: 'error' }),
  info: (message: string, action?: { label: string; onPress: () => void }) =>
    useUiStore.getState().showToast({ message, kind: 'info', actionLabel: action?.label, onAction: action?.onPress }),
};
