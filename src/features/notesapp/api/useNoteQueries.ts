'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { 
  NoteWithRelations, 
  TagRecord, 
  CategoryWithChildren, 
  ThemeRecord, 
  NotebookRecord 
} from '@/shared/types/notes';

const NOTES_STALE_MS = 10_000;

export function useNotebooks(): UseQueryResult<NotebookRecord[]> {
  return useQuery({
    queryKey: QUERY_KEYS.notes.notebooks,
    queryFn: () => api.get<NotebookRecord[]>('/api/notes/notebooks'),
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteFolderTree(notebookId?: string): UseQueryResult<CategoryWithChildren[]> {
  return useQuery({
    queryKey: [...QUERY_KEYS.notes.all, 'folder-tree', notebookId],
    queryFn: () => 
      notebookId 
        ? api.get<CategoryWithChildren[]>('/api/notes/categories/tree', { params: { notebookId } })
        : Promise.resolve([] as CategoryWithChildren[]),
    enabled: !!notebookId,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteTags(notebookId?: string): UseQueryResult<TagRecord[]> {
  return useQuery({
    queryKey: [...QUERY_KEYS.notes.tags, notebookId],
    queryFn: () => 
      notebookId 
        ? api.get<TagRecord[]>('/api/notes/tags', { params: { notebookId } })
        : Promise.resolve([] as TagRecord[]),
    enabled: !!notebookId,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteThemes(notebookId?: string): UseQueryResult<ThemeRecord[]> {
  return useQuery({
    queryKey: [...QUERY_KEYS.notes.all, 'themes', notebookId],
    queryFn: () => 
      notebookId 
        ? api.get<ThemeRecord[]>('/api/notes/themes', { params: { notebookId } })
        : Promise.resolve([] as ThemeRecord[]),
    enabled: !!notebookId,
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

export function useNotes(params: FetchNotesParams): UseQueryResult<NoteWithRelations[]> {
  return useQuery({
    queryKey: QUERY_KEYS.notes.list(params),
    queryFn: () => {
      const { notebookId, search, searchScope, isPinned, isArchived, isFavorite, tagIds, categoryIds, truncateContent } = params;
      if (!notebookId) return Promise.resolve([] as NoteWithRelations[]);

      return api.get<NoteWithRelations[]>('/api/notes', {
        params: {
          notebookId,
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
    enabled: !!params.notebookId,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNote(noteId: string | null): UseQueryResult<NoteWithRelations | null> {

  return useQuery({

    queryKey: QUERY_KEYS.notes.detail(noteId || 'none'),

    queryFn: async () => {

      if (!noteId) return null;

      return api.get<NoteWithRelations>(`/api/notes/${noteId}`);

    },

    enabled: !!noteId,

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
