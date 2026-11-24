import type { Note, Notebook } from '@/types/models';

import { getDb } from '../database';
import type { NoteRow, NotebookRow } from '../schema';

import { bool, int, upsertRow } from './helpers';

const toNote = (r: NoteRow): Note => ({
  id: r.id,
  notebookId: r.notebook_id,
  title: r.title,
  content: r.content,
  color: r.color,
  pinned: bool(r.pinned),
  archived: bool(r.archived),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const noteRepository = {
  async getNotebooks(): Promise<Notebook[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<NotebookRow>('SELECT * FROM notebooks ORDER BY sort_order ASC, created_at ASC');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      color: r.color,
      sortOrder: r.sort_order,
      createdAt: r.created_at,
    }));
  },
  async getNotes(): Promise<Note[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<NoteRow>('SELECT * FROM notes ORDER BY updated_at DESC');
    return rows.map(toNote);
  },
  async saveNotebook(n: Notebook): Promise<void> {
    const db = await getDb();
    await upsertRow(db, 'notebooks', {
      id: n.id,
      name: n.name,
      icon: n.icon,
      color: n.color,
      sort_order: n.sortOrder,
      created_at: n.createdAt,
    });
  },
  async removeNotebook(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM notebooks WHERE id = ?', id);
  },
  async saveNote(n: Note): Promise<void> {
    const db = await getDb();
    const notebookExists = n.notebookId
      ? await db.getFirstAsync<{ id: string }>('SELECT id FROM notebooks WHERE id = ?', n.notebookId)
      : null;
    await upsertRow(db, 'notes', {
      id: n.id,
      notebook_id: notebookExists ? n.notebookId : null,
      title: n.title,
      content: n.content,
      color: n.color,
      pinned: int(n.pinned),
      archived: int(n.archived),
      created_at: n.createdAt,
      updated_at: n.updatedAt,
    });
  },
  async removeNote(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM notes WHERE id = ?', id);
  },
};
