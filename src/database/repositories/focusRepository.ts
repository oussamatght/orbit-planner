import type { FocusMode, FocusSession } from '@/types/models';

import { getDb } from '../database';
import type { FocusSessionRow } from '../schema';

import { bool, insertRow, int } from './helpers';

const MODES: FocusMode[] = ['focus', 'short_break', 'long_break'];

export const focusRepository = {
  async getAll(): Promise<FocusSession[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<FocusSessionRow>('SELECT * FROM focus_sessions ORDER BY started_at DESC');
    return rows.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      mode: MODES.includes(r.mode as FocusMode) ? (r.mode as FocusMode) : 'focus',
      plannedSeconds: r.planned_seconds,
      actualSeconds: r.actual_seconds,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      completed: bool(r.completed),
    }));
  },
  async insert(s: FocusSession): Promise<void> {
    const db = await getDb();
    const taskExists = s.taskId
      ? await db.getFirstAsync<{ id: string }>('SELECT id FROM tasks WHERE id = ?', s.taskId)
      : null;
    await insertRow(db, 'focus_sessions', {
      id: s.id,
      task_id: taskExists ? s.taskId : null,
      mode: s.mode,
      planned_seconds: s.plannedSeconds,
      actual_seconds: s.actualSeconds,
      started_at: s.startedAt,
      ended_at: s.endedAt,
      completed: int(s.completed),
    });
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM focus_sessions WHERE id = ?', id);
  },
};
