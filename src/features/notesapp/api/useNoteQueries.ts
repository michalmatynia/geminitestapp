'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';

export * from './useNotebookResource';


import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { 
  NoteWithRelations, 
  TagRecord, 
  CategoryRecord,
  CategoryWithChildren, 
  ThemeRecord, 
  NotebookRecord,
  RelatedNote
} from '@/shared/types/domain/notes';

import { createQueryHook } from '@/shared/lib/api-hooks';
import { 
  notebookSchema, 
  noteWithRelationsSchema, 
  noteTagSchema, 
  noteThemeSchema,
  noteCategorySchema,
  noteCategoryWithChildrenSchema,
  relatedNoteSchema
} from '@/shared/contracts/notes';

const NOTES_STALE_MS = 10_000;

interface QueryOptions {
  enabled?: boolean;
}

export const useNotebooks = createQueryHook({
  queryKeyFactory: () => QUERY_KEYS.notes.notebooks,
  endpoint: '/api/notes/notebooks',
  schema: z.array(notebookSchema),
  staleTime: NOTES_STALE_MS,
});

export const useNoteFolderTree = createQueryHook({
  queryKeyFactory: (notebookId?: string) => QUERY_KEYS.notes.folderTree(notebookId),
  endpoint: '/api/notes/categories/tree',
  schema: z.array(noteCategoryWithChildrenSchema),
  staleTime: NOTES_STALE_MS,
});

export const useNoteTags = createQueryHook({
  queryKeyFactory: (notebookId?: string) => QUERY_KEYS.notes.tags(notebookId),
  endpoint: '/api/notes/tags',
  schema: z.array(noteTagSchema),
  staleTime: NOTES_STALE_MS,
});

export const useNoteThemes = createQueryHook({
  queryKeyFactory: (notebookId?: string) => QUERY_KEYS.notes.themes(notebookId),
  endpoint: '/api/notes/themes',
  schema: z.array(noteThemeSchema),
  staleTime: NOTES_STALE_MS,
});

export const useNoteCategories = createQueryHook({
  queryKeyFactory: (notebookId?: string | null) => QUERY_KEYS.notes.categories(notebookId),
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
  queryKeyFactory: (params: FetchNotesParams) => QUERY_KEYS.notes.list(params),
  endpoint: '/api/notes',
  schema: z.array(noteWithRelationsSchema),
  staleTime: NOTES_STALE_MS,
});

export const useNote = createQueryHook({
  queryKeyFactory: (noteId: string | null) => QUERY_KEYS.notes.detail(noteId || 'none'),
  endpoint: (noteId: string | null) => `/api/notes/${noteId}`,
  schema: noteWithRelationsSchema.nullable(),
  staleTime: NOTES_STALE_MS,
});

export const useNotesLookup = createQueryHook({
  queryKeyFactory: (noteIds: string[]) => QUERY_KEYS.notes.lookup(noteIds.filter(Boolean)),
  endpoint: '/api/notes/lookup',
  schema: z.array(relatedNoteSchema),
  staleTime: NOTES_STALE_MS,
});
