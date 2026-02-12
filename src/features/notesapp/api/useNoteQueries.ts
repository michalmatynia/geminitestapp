'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export * from './useNotebookResource';

import type { 
  NoteWithRelations, 
  TagRecord, 
  CategoryRecord,
  CategoryWithChildren, 
  ThemeRecord, 
  NotebookRecord,
  RelatedNote
} from '@/shared/types/domain/notes';

const NOTES_STALE_MS = 10_000;

interface QueryOptions {
  enabled?: boolean;
}

export function useNotebooks(options?: QueryOptions): UseQueryResult<NotebookRecord[]> {
  return useQuery({
    queryKey: QUERY_KEYS.notes.notebooks,
    queryFn: () => api.get<NotebookRecord[]>('/api/notes/notebooks'),
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteFolderTree(notebookId?: string, options?: QueryOptions): UseQueryResult<CategoryWithChildren[]> {
  return useQuery({
    queryKey: QUERY_KEYS.notes.folderTree(notebookId),
    queryFn: () => 
      notebookId 
        ? api.get<CategoryWithChildren[]>('/api/notes/categories/tree', { params: { notebookId } })
        : Promise.resolve([] as CategoryWithChildren[]),
    enabled: (options?.enabled ?? true) && !!notebookId,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteTags(notebookId?: string, options?: QueryOptions): UseQueryResult<TagRecord[]> {
  return useQuery({
    queryKey: [...QUERY_KEYS.notes.tags, notebookId],
    queryFn: () =>
      api.get<TagRecord[]>('/api/notes/tags', {
        params: {
          ...(notebookId ? { notebookId } : {}),
        },
      }),
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteThemes(notebookId?: string, options?: QueryOptions): UseQueryResult<ThemeRecord[]> {
  return useQuery({
    queryKey: QUERY_KEYS.notes.themes(notebookId),
    queryFn: () =>
      api.get<ThemeRecord[]>('/api/notes/themes', {
        params: {
          ...(notebookId ? { notebookId } : {}),
        },
      }),
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteCategories(notebookId?: string | null, options?: QueryOptions): UseQueryResult<CategoryRecord[]> {
  return useQuery({
    queryKey: [...QUERY_KEYS.notes.categories, notebookId],
    queryFn: () =>
      notebookId
        ? api.get<CategoryRecord[]>('/api/notes/categories', { params: { notebookId } })
        : Promise.resolve([] as CategoryRecord[]),
    enabled: (options?.enabled ?? true) && !!notebookId,
    staleTime: NOTES_STALE_MS,
  });
}

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

export function useNotes(params: FetchNotesParams, options?: QueryOptions): UseQueryResult<NoteWithRelations[]> {
  return useQuery({
    queryKey: QUERY_KEYS.notes.list(params),
    queryFn: () => {
      const { notebookId, search, searchScope, isPinned, isArchived, isFavorite, tagIds, categoryIds, truncateContent } = params;

      return api.get<NoteWithRelations[]>('/api/notes', {
        params: {
          notebookId: notebookId || undefined,
          search: search || undefined,
          searchScope: search ? (searchScope || 'content') : undefined,
          isPinned: isPinned !== undefined ? String(isPinned) : undefined,
          isArchived: isArchived !== undefined ? String(isArchived) : undefined,
          isFavorite: isFavorite !== undefined ? String(isFavorite) : undefined,
          tagIds: tagIds && tagIds.length > 0 ? tagIds.join(',') : undefined,
          categoryIds: categoryIds && categoryIds.length > 0 ? categoryIds.join(',') : undefined,
          truncateContent: truncateContent ? 'true' : undefined,
        }
      });
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNote(noteId: string | null, options?: QueryOptions): UseQueryResult<NoteWithRelations | null> {

  return useQuery({

    queryKey: QUERY_KEYS.notes.detail(noteId || 'none'),

    queryFn: async () => {

      if (!noteId) return null;

      return api.get<NoteWithRelations>(`/api/notes/${noteId}`);

    },

    enabled: (options?.enabled ?? true) && !!noteId,

    staleTime: NOTES_STALE_MS,

  });

}



export function useNotesLookup(noteIds: string[]): UseQueryResult<RelatedNote[], Error> {

  const ids = noteIds.filter(Boolean);

  return useQuery<RelatedNote[], Error>({

    queryKey: QUERY_KEYS.notes.lookup(ids),

    queryFn: () => api.get<RelatedNote[]>('/api/notes/lookup', {

      params: { ids: ids.join(',') }

    }),

    enabled: ids.length > 0,

    staleTime: NOTES_STALE_MS,

  });

}
