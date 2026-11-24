import type { Category, Project, Tag } from '@/types/models';

import { getDb } from '../database';
import type { CategoryRow, ProjectRow, TagRow } from '../schema';

import { bool, int, upsertRow } from './helpers';

const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  name: r.name,
  description: r.description,
  icon: r.icon,
  color: r.color,
  archived: bool(r.archived),
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const projectRepository = {
  async getAll(): Promise<Project[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<ProjectRow>('SELECT * FROM projects ORDER BY sort_order ASC, created_at ASC');
    return rows.map(toProject);
  },
  async save(p: Project): Promise<void> {
    const db = await getDb();
    await upsertRow(db, 'projects', {
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon,
      color: p.color,
      archived: int(p.archived),
      sort_order: p.sortOrder,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    });
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM projects WHERE id = ?', id);
  },
};

export const categoryRepository = {
  async getAll(): Promise<Category[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY name COLLATE NOCASE');
    return rows.map((r) => ({ id: r.id, name: r.name, color: r.color, createdAt: r.created_at }));
  },
  async save(c: Category): Promise<void> {
    const db = await getDb();
    await upsertRow(db, 'categories', { id: c.id, name: c.name, color: c.color, created_at: c.createdAt });
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  },
};

export const tagRepository = {
  async getAll(): Promise<Tag[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<TagRow>('SELECT * FROM tags ORDER BY name COLLATE NOCASE');
    return rows.map((r) => ({ id: r.id, name: r.name, color: r.color, createdAt: r.created_at }));
  },
  async save(t: Tag): Promise<void> {
    const db = await getDb();
    await upsertRow(db, 'tags', { id: t.id, name: t.name, color: t.color, created_at: t.createdAt });
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM tags WHERE id = ?', id);
  },
};
