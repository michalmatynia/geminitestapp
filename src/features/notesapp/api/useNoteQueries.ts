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
import { api } from '@/shared/lib/api-client';
import { createListQuery, createSingleQuery } from '@/shared/lib/query-factories-v2';
import { noteKeys } from '@/shared/lib/query-key-exports';
import type { 
  NotebookRecord, 
  CategoryRecord, 
  NoteWithRelations, 
  TagRecord, 
  ThemeRecord,
  RelatedNote
} from '@/shared/types/domain/notes';
import type { ListQuery, SingleQuery } from '@/shared/types/query-result-types';

const NOTES_STALE_MS = 10_000;

type QueryOptions = {
  enabled?: boolean;
};

export function useNotebooks(_notebookId?: string, options?: QueryOptions): ListQuery<NotebookRecord> {
  return createListQuery({
    queryKey: noteKeys.notebooks(),
    queryFn: async (): Promise<NotebookRecord[]> => {
      const data = await api.get<NotebookRecord[]>('/api/notes/notebooks');
      return z.array(notebookSchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteFolderTree(notebookId?: string, options?: QueryOptions): ListQuery<CategoryRecord> {
  return createListQuery({
    queryKey: noteKeys.folderTree(notebookId),
    queryFn: async (): Promise<CategoryRecord[]> => {
      const url = notebookId 
        ? `/api/notes/categories/tree?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/categories/tree';
      const data = await api.get<CategoryRecord[]>(url);
      return z.array(noteCategoryWithChildrenSchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteTags(notebookId?: string, options?: QueryOptions): ListQuery<TagRecord> {
  return createListQuery({
    queryKey: noteKeys.tags(notebookId),
    queryFn: async (): Promise<TagRecord[]> => {
      const url = notebookId 
        ? `/api/notes/tags?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/tags';
      const data = await api.get<TagRecord[]>(url);
      return z.array(noteTagSchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteThemes(notebookId?: string, options?: QueryOptions): ListQuery<ThemeRecord> {
  return createListQuery({
    queryKey: noteKeys.themes(notebookId),
    queryFn: async (): Promise<ThemeRecord[]> => {
      const url = notebookId 
        ? `/api/notes/themes?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/themes';
      const data = await api.get<ThemeRecord[]>(url);
      return z.array(noteThemeSchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteCategories(notebookId?: string | null, options?: QueryOptions): ListQuery<CategoryRecord> {
  return createListQuery({
    queryKey: noteKeys.categories(notebookId),
    queryFn: async (): Promise<CategoryRecord[]> => {
      const url = notebookId 
        ? `/api/notes/categories?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/categories';
      const data = await api.get<CategoryRecord[]>(url);
      return z.array(noteCategorySchema).parse(data);
    },
    enabled: options?.enabled ?? true,
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

export function useNotes(params: FetchNotesParams, options?: QueryOptions): ListQuery<NoteWithRelations> {
  return createListQuery({
    queryKey: noteKeys.list(params),
    queryFn: async (): Promise<NoteWithRelations[]> => {
      const queryParams = params as unknown as Record<string, string | number | boolean | undefined>;
      const data = await api.get<NoteWithRelations[]>('/api/notes', { params: queryParams });
      return z.array(noteWithRelationsSchema).parse(data) as unknown as NoteWithRelations[];
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNote(noteId: string | null, options?: QueryOptions): SingleQuery<NoteWithRelations | null> {
  return createSingleQuery({
    id: noteId,
    queryKey: noteKeys.detail(noteId || 'none'),
    queryFn: async (): Promise<NoteWithRelations | null> => {
      if (!noteId) return null;
      const data = await api.get<NoteWithRelations>(`/api/notes/${noteId}`);
      return noteWithRelationsSchema.nullable().parse(data) as unknown as NoteWithRelations | null;
    },
    staleTime: NOTES_STALE_MS,
    enabled: (options?.enabled ?? true) && !!noteId,
  });
}

export function useNotesLookup(noteIds: string[], options?: QueryOptions): ListQuery<RelatedNote> {
  const filteredIds = noteIds.filter(Boolean);
  return createListQuery({
    queryKey: noteKeys.lookup(filteredIds),
    queryFn: async (): Promise<RelatedNote[]> => {
      if (filteredIds.length === 0) return [];
      const data = await api.get<RelatedNote[]>('/api/notes/lookup', { 
        params: { ids: filteredIds.join(',') } 
      });
      return z.array(relatedNoteSchema).parse(data);
    },
    staleTime: NOTES_STALE_MS,
    enabled: (options?.enabled ?? true) && filteredIds.length > 0,
  });
}
