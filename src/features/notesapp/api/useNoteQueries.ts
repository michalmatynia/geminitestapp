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
import { createListQuery, createSingleQuery } from '@/shared/lib/query-factories';
import { noteKeys } from '@/shared/lib/query-key-exports';
import type { ListQuery, SingleQuery } from '@/shared/types/query-result-types';
import type { 
  NotebookRecord, 
  CategoryRecord, 
  NoteWithRelations, 
  TagRecord, 
  ThemeRecord,
  RelatedNote
} from '@/shared/types/domain/notes';

const NOTES_STALE_MS = 10_000;

export function useNotebooks(): ListQuery<NotebookRecord> {
  return createListQuery({
    queryKey: noteKeys.notebooks(),
    queryFn: async (): Promise<NotebookRecord[]> => {
      const data = await api.get<NotebookRecord[]>('/api/notes/notebooks');
      return z.array(notebookSchema).parse(data) as NotebookRecord[];
    },
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteFolderTree(notebookId?: string): ListQuery<CategoryRecord> {
  return createListQuery({
    queryKey: noteKeys.folderTree(notebookId),
    queryFn: async (): Promise<CategoryRecord[]> => {
      const url = notebookId 
        ? `/api/notes/categories/tree?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/categories/tree';
      const data = await api.get<CategoryRecord[]>(url);
      return z.array(noteCategoryWithChildrenSchema).parse(data) as CategoryRecord[];
    },
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteTags(notebookId?: string): ListQuery<TagRecord> {
  return createListQuery({
    queryKey: noteKeys.tags(notebookId),
    queryFn: async (): Promise<TagRecord[]> => {
      const url = notebookId 
        ? `/api/notes/tags?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/tags';
      const data = await api.get<TagRecord[]>(url);
      return z.array(noteTagSchema).parse(data) as TagRecord[];
    },
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteThemes(notebookId?: string): ListQuery<ThemeRecord> {
  return createListQuery({
    queryKey: noteKeys.themes(notebookId),
    queryFn: async (): Promise<ThemeRecord[]> => {
      const url = notebookId 
        ? `/api/notes/themes?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/themes';
      const data = await api.get<ThemeRecord[]>(url);
      return z.array(noteThemeSchema).parse(data) as ThemeRecord[];
    },
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteCategories(notebookId?: string | null): ListQuery<CategoryRecord> {
  return createListQuery({
    queryKey: noteKeys.categories(notebookId),
    queryFn: async (): Promise<CategoryRecord[]> => {
      const url = notebookId 
        ? `/api/notes/categories?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/categories';
      const data = await api.get<CategoryRecord[]>(url);
      return z.array(noteCategorySchema).parse(data) as CategoryRecord[];
    },
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

export function useNotes(params: FetchNotesParams): ListQuery<NoteWithRelations> {
  return createListQuery({
    queryKey: noteKeys.list(params),
    queryFn: async (): Promise<NoteWithRelations[]> => {
      const data = await api.get<NoteWithRelations[]>('/api/notes', { params });
      return z.array(noteWithRelationsSchema).parse(data) as NoteWithRelations[];
    },
    staleTime: NOTES_STALE_MS,
  });
}

export function useNote(noteId: string | null): SingleQuery<NoteWithRelations | null> {
  return createSingleQuery({
    id: noteId,
    queryKey: noteKeys.detail(noteId || 'none'),
    queryFn: async (): Promise<NoteWithRelations | null> => {
      if (!noteId) return null;
      const data = await api.get<NoteWithRelations>(`/api/notes/${noteId}`);
      return noteWithRelationsSchema.nullable().parse(data) as NoteWithRelations | null;
    },
    staleTime: NOTES_STALE_MS,
    enabled: !!noteId,
  });
}

export function useNotesLookup(noteIds: string[]): ListQuery<RelatedNote> {
  const filteredIds = noteIds.filter(Boolean);
  return createListQuery({
    queryKey: noteKeys.lookup(filteredIds),
    queryFn: async (): Promise<RelatedNote[]> => {
      if (filteredIds.length === 0) return [];
      const data = await api.get<RelatedNote[]>('/api/notes/lookup', { 
        params: { ids: filteredIds.join(',') } 
      });
      return z.array(relatedNoteSchema).parse(data) as RelatedNote[];
    },
    staleTime: NOTES_STALE_MS,
    enabled: filteredIds.length > 0,
  });
}
