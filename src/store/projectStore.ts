import { create } from 'zustand';

import { categoryRepository, projectRepository, tagRepository } from '@/database/repositories';
import type { Category, Project, Tag } from '@/types/models';
import { nowIso } from '@/utils/date';
import { createId } from '@/utils/id';

import { useTaskStore } from './taskStore';

export interface ProjectInput {
  name: string;
  description?: string;
  icon: string;
  color: string;
}

interface ProjectState {
  projects: Project[];
  categories: Category[];
  tags: Tag[];
  loaded: boolean;
  load: () => Promise<void>;
  createProject: (input: ProjectInput) => Promise<Project>;
  updateProject: (id: string, patch: Partial<ProjectInput> & { archived?: boolean }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createCategory: (name: string, color: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  createTag: (name: string, color: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
}

const clean = (s: string, max: number) => s.trim().replace(/\s+/g, ' ').slice(0, max);

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  categories: [],
  tags: [],
  loaded: false,

  load: async () => {
    const [projects, categories, tags] = await Promise.all([
      projectRepository.getAll(),
      categoryRepository.getAll(),
      tagRepository.getAll(),
    ]);
    set({ projects, categories, tags, loaded: true });
  },

  createProject: async (input) => {
    const name = clean(input.name, 60);
    if (!name) throw new Error('Project name is required');
    const now = nowIso();
    const project: Project = {
      id: createId(),
      name,
      description: input.description?.trim().slice(0, 500) ?? '',
      icon: input.icon,
      color: input.color,
      archived: false,
      sortOrder: get().projects.length,
      createdAt: now,
      updatedAt: now,
    };
    await projectRepository.save(project);
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  updateProject: async (id, patch) => {
    const current = get().projects.find((p) => p.id === id);
    if (!current) return;
    const next: Project = {
      ...current,
      ...patch,
      name: patch.name !== undefined ? clean(patch.name, 60) || current.name : current.name,
      description: patch.description !== undefined ? patch.description.trim().slice(0, 500) : current.description,
      updatedAt: nowIso(),
    };
    await projectRepository.save(next);
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? next : p)) }));
  },

  deleteProject: async (id) => {
    await projectRepository.remove(id);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
    // The database already set project_id to NULL (ON DELETE SET NULL); mirror it in memory.
    useTaskStore.setState((s) => ({
      tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
    }));
  },

  createCategory: async (name, color) => {
    const value = clean(name, 40);
    if (!value) throw new Error('Name is required');
    if (get().categories.some((c) => c.name.toLowerCase() === value.toLowerCase())) throw new Error('duplicate');
    const category: Category = { id: createId(), name: value, color, createdAt: nowIso() };
    await categoryRepository.save(category);
    set((s) => ({ categories: [...s.categories, category].sort((a, b) => a.name.localeCompare(b.name)) }));
    return category;
  },

  deleteCategory: async (id) => {
    await categoryRepository.remove(id);
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
    useTaskStore.setState((s) => ({
      tasks: s.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
    }));
  },

  createTag: async (name, color) => {
    const value = clean(name, 30).replace(/^#/, '');
    if (!value) throw new Error('Name is required');
    const existing = get().tags.find((t) => t.name.toLowerCase() === value.toLowerCase());
    if (existing) return existing;
    const tag: Tag = { id: createId(), name: value, color, createdAt: nowIso() };
    await tagRepository.save(tag);
    set((s) => ({ tags: [...s.tags, tag].sort((a, b) => a.name.localeCompare(b.name)) }));
    return tag;
  },

  deleteTag: async (id) => {
    await tagRepository.remove(id);
    set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }));
    useTaskStore.setState((s) => ({
      tasks: s.tasks.map((t) => (t.tagIds.includes(id) ? { ...t, tagIds: t.tagIds.filter((x) => x !== id) } : t)),
    }));
  },
}));
