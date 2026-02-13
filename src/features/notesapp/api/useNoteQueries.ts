'use client';

import { z } from 'zod';

export * from './useNotebookResource';

import { 
  notebookSchema, 
  noteWithRelationsSchema, 
  noteTagSchema, 
  noteThemeSchema,
  noteCategorySchema,
  noteCategoryWithChildrenSchema,
  relatedNoteSchema
} from '@/shared/contracts/notes';
import { createQueryHook } from '@/shared/lib/api-hooks';
import { noteKeys } from '@/shared/lib/query-key-exports';

const NOTES_STALE_MS = 10_000;

export const useNotebooks = createQueryHook({
  queryKeyFactory: () => noteKeys.notebooks,
  endpoint: '/api/notes/notebooks',
  schema: z.array(notebookSchema),
  staleTime: NOTES_STALE_MS,
});

export const useNoteFolderTree = createQueryHook({
  queryKeyFactory: (notebookId?: string) => noteKeys.folderTree(notebookId),
  endpoint: '/api/notes/categories/tree',
  schema: z.array(noteCategoryWithChildrenSchema),
  staleTime: NOTES_STALE_MS,
});

export const useNoteTags = createQueryHook({
  queryKeyFactory: (notebookId?: string) => noteKeys.tags(notebookId),
  endpoint: '/api/notes/tags',
  schema: z.array(noteTagSchema),
  staleTime: NOTES_STALE_MS,
});

export const useNoteThemes = createQueryHook({
  queryKeyFactory: (notebookId?: string) => noteKeys.themes(notebookId),
  endpoint: '/api/notes/themes',
  schema: z.array(noteThemeSchema),
  staleTime: NOTES_STALE_MS,
});

export const useNoteCategories = createQueryHook({
  queryKeyFactory: (notebookId?: string | null) => noteKeys.categories(notebookId),
  endpoint: '/api/notes/categories',
  schema: z.array(noteCategorySchema),
  staleTime: NOTES_STALE_MS,
});

export interface FetchNotesParams {
  notebookId?: string | undefined;
  search?: string | undefined;
  searchScope?: string | undefined;
  isPinned?: boolean | undefined;
  isArchived?: boolean | undefined;
  isFavorite?: boolean | undefined;
  tagIds?: string[] | undefined;
  categoryIds?: string[] | undefined;
  truncateContent?: boolean | undefined;
}

export const useNotes = createQueryHook({
  queryKeyFactory: (params: FetchNotesParams) => noteKeys.list(params),
  endpoint: '/api/notes',
  schema: z.array(noteWithRelationsSchema),
  staleTime: NOTES_STALE_MS,
});

export const useNote = createQueryHook({
  queryKeyFactory: (noteId: string | null) => noteKeys.detail(noteId || 'none'),
  endpoint: (noteId: string | null) => `/api/notes/${noteId}`,
  schema: noteWithRelationsSchema.nullable(),
  staleTime: NOTES_STALE_MS,
});

export const useNotesLookup = createQueryHook({
  queryKeyFactory: (noteIds: string[]) => noteKeys.lookup(noteIds.filter(Boolean)),
  endpoint: '/api/notes/lookup',
  schema: z.array(relatedNoteSchema),
  staleTime: NOTES_STALE_MS,
});
