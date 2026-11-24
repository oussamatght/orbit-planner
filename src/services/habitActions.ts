import { t } from '@/i18n';
import { useHabitStore } from '@/store/habitStore';
import { toast } from '@/store/uiStore';
import type { DateKey } from '@/types/models';
import { haptics } from '@/utils/haptics';

export async function checkInHabit(habitId: string, date: DateKey): Promise<void> {
  try {
    const habit = useHabitStore.getState().habits.find((h) => h.id === habitId);
    const next = await useHabitStore.getState().checkIn(habitId, date);
    if (habit && next >= habit.targetPerDay) haptics.success();
    else haptics.light();
  } catch {
    haptics.error();
    toast.error(t('error.saveFailed'));
  }
}

export async function resetHabitDay(habitId: string, date: DateKey): Promise<void> {
  try {
    await useHabitStore.getState().setCount(habitId, date, 0);
    haptics.medium();
  } catch {
    toast.error(t('error.saveFailed'));
  }
}
