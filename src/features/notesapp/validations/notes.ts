import {
  createNoteSchema,
  createNotebookSchema,
  createNoteCategorySchema,
  createNoteTagSchema,
  createNoteThemeSchema,
  type NoteCreateData,
  type NoteUpdateData,
  type TagCreateData,
  type TagUpdateData,
  type CategoryCreateData,
  type CategoryUpdateData,
  type NotebookCreateData,
  type NotebookUpdateData,
  type ThemeCreateData,
  type ThemeUpdateData,
} from '@/shared/contracts/notes';

export {
  type NoteCreateData,
  type NoteUpdateData,
  type TagCreateData,
  type TagUpdateData,
  type CategoryCreateData,
  type CategoryUpdateData,
  type NotebookCreateData,
  type NotebookUpdateData,
  type ThemeCreateData,
  type ThemeUpdateData,
};

export const noteCreateSchema = createNoteSchema.strict();
export const noteUpdateSchema = noteCreateSchema.partial().strict();

export const tagCreateSchema = createNoteTagSchema.strict();
export const tagUpdateSchema = tagCreateSchema.partial().strict();

export const categoryCreateSchema = createNoteCategorySchema.strict();
export const categoryUpdateSchema = categoryCreateSchema.partial().strict();

export const notebookCreateSchema = createNotebookSchema.strict();
export const notebookUpdateSchema = notebookCreateSchema.partial().strict();

export const themeCreateSchema = createNoteThemeSchema.strict();
export const themeUpdateSchema = themeCreateSchema.partial().strict();
