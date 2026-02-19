import { z } from 'zod';

import {
  createNoteSchema,
  createNotebookSchema,
  createNoteCategorySchema,
  createNoteTagSchema,
  createNoteThemeSchema,
} from '@/shared/contracts/notes';

export const noteCreateSchema = createNoteSchema.strict();

export const noteUpdateSchema = noteCreateSchema.partial().strict();

export type NoteCreateData = z.infer<typeof noteCreateSchema>;
export type NoteUpdateData = z.infer<typeof noteUpdateSchema>;

export const tagCreateSchema = createNoteTagSchema.strict();

export const tagUpdateSchema = tagCreateSchema.partial().strict();

export type TagCreateData = z.infer<typeof tagCreateSchema>;
export type TagUpdateData = z.infer<typeof tagUpdateSchema>;

export const categoryCreateSchema = createNoteCategorySchema.strict();

export const categoryUpdateSchema = categoryCreateSchema.partial().strict();

export type CategoryCreateData = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateData = z.infer<typeof categoryUpdateSchema>;

export const notebookCreateSchema = createNotebookSchema.strict();

export const notebookUpdateSchema = notebookCreateSchema.partial().strict();

export type NotebookCreateData = z.infer<typeof notebookCreateSchema>;
export type NotebookUpdateData = z.infer<typeof notebookUpdateSchema>;

export const themeCreateSchema = createNoteThemeSchema.strict();

export const themeUpdateSchema = themeCreateSchema.partial().strict();

export type ThemeCreateData = z.infer<typeof themeCreateSchema>;
export type ThemeUpdateData = z.infer<typeof themeUpdateSchema>;
