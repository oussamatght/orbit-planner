import { create } from 'zustand';

import { noteRepository } from '@/database/repositories';
import type { Note, Notebook } from '@/types/models';
import { nowIso } from '@/utils/date';
import { createId } from '@/utils/id';

export interface NotebookInput {
  name: string;
  icon: string;
  color: string;
}

export type NotePatch = Partial<Pick<Note, 'title' | 'content' | 'color' | 'pinned' | 'archived' | 'notebookId'>>;

interface NoteState {
  notebooks: Notebook[];
  notes: Note[];
  loaded: boolean;
  load: () => Promise<void>;
  createNote: (initial?: NotePatch) => Promise<Note>;
  updateNote: (id: string, patch: NotePatch) => Promise<void>;
  deleteNote: (id: string) => Promise<Note | null>;
  restoreNote: (note: Note) => Promise<void>;
  createNotebook: (input: NotebookInput) => Promise<Notebook>;
  updateNotebook: (id: string, input: NotebookInput) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notebooks: [],
  notes: [],
  loaded: false,

  load: async () => {
    const [notebooks, notes] = await Promise.all([noteRepository.getNotebooks(), noteRepository.getNotes()]);
    set({ notebooks, notes, loaded: true });
  },

  createNote: async (initial = {}) => {
    const now = nowIso();
    const note: Note = {
      id: createId(),
      notebookId: initial.notebookId ?? null,
      title: initial.title ?? '',
      content: initial.content ?? '',
      color: initial.color ?? null,
      pinned: initial.pinned ?? false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    await noteRepository.saveNote(note);
    set((s) => ({ notes: [note, ...s.notes] }));
    return note;
  },

  updateNote: async (id, patch) => {
    const current = get().notes.find((n) => n.id === id);
    if (!current) return;
    const contentChanged = patch.title !== undefined || patch.content !== undefined;
    const next: Note = {
      ...current,
      ...patch,
      title: patch.title !== undefined ? patch.title.slice(0, 200) : current.title,
      updatedAt: contentChanged ? nowIso() : current.updatedAt,
    };
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? next : n)) }));
    try {
      await noteRepository.saveNote(next);
    } catch (error) {
      set((s) => ({ notes: s.notes.map((n) => (n.id === id ? current : n)) }));
      throw error;
    }
  },

  deleteNote: async (id) => {
    const note = get().notes.find((n) => n.id === id) ?? null;
    await noteRepository.removeNote(id);
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    return note;
  },

  restoreNote: async (note) => {
    await noteRepository.saveNote(note);
    set((s) => ({ notes: [note, ...s.notes.filter((n) => n.id !== note.id)] }));
  },

  createNotebook: async (input) => {
    const name = input.name.trim().slice(0, 40);
    if (!name) throw new Error('Notebook name is required');
    const notebook: Notebook = {
      id: createId(),
      name,
      icon: input.icon,
      color: input.color,
      sortOrder: get().notebooks.length,
      createdAt: nowIso(),
    };
    await noteRepository.saveNotebook(notebook);
    set((s) => ({ notebooks: [...s.notebooks, notebook] }));
    return notebook;
  },

  updateNotebook: async (id, input) => {
    const current = get().notebooks.find((n) => n.id === id);
    if (!current) return;
    const next: Notebook = { ...current, ...input, name: input.name.trim().slice(0, 40) || current.name };
    await noteRepository.saveNotebook(next);
    set((s) => ({ notebooks: s.notebooks.map((n) => (n.id === id ? next : n)) }));
  },

  deleteNotebook: async (id) => {
    await noteRepository.removeNotebook(id);
    set((s) => ({
      notebooks: s.notebooks.filter((n) => n.id !== id),
      notes: s.notes.map((n) => (n.notebookId === id ? { ...n, notebookId: null } : n)),
    }));
  },
}));
