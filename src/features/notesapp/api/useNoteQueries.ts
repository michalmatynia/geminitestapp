'use client';

import { z } from 'zod';

import {
  noteWithRelationsSchema,
  noteTagSchema,
  noteThemeSchema,
  noteCategorySchema,
  noteCategoryRecordWithChildrenSchema as noteCategoryWithChildrenSchema,
  relatedNoteSchema,
} from '@/shared/contracts/notes';
import type {
  NotebookRecord,
  CategoryRecord,
  NoteWithRelationsDto as NoteWithRelations,
  TagRecord,
  ThemeRecord,
  RelatedNoteDto as RelatedNote,
  FetchNotesParams,
} from '@/shared/contracts/notes';
export type { FetchNotesParams };
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { noteKeys } from '@/shared/lib/query-key-exports';

import { useNotebookResource } from './useNotebookResource';

export * from './useNotebookResource';

/**
 * @deprecated Use useNotebookResource().listQuery instead.
 */
export function useNotebooks(
  _notebookId?: string,
  _options?: QueryOptions
): ListQuery<NotebookRecord> {
  const { listQuery } = useNotebookResource();
  return listQuery;
}

const NOTES_STALE_MS = 10_000;

type QueryOptions = {
  enabled?: boolean;
};

export function useNoteFolderTree(
  notebookId?: string,
  options?: QueryOptions
): ListQuery<CategoryRecord> {
  const queryKey = noteKeys.folderTree(notebookId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<CategoryRecord[]> => {
      const url = notebookId
        ? `/api/notes/categories/tree?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/categories/tree';
      const data = await api.get<CategoryRecord[]>(url);
      return z.array(noteCategoryWithChildrenSchema).parse(data) as unknown as CategoryRecord[];
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
    meta: {
      source: 'notes.hooks.useNoteFolderTree',
      operation: 'list',
      resource: 'notes.folder-tree',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'folder-tree'],
    },
  });
}

export function useNoteTags(notebookId?: string, options?: QueryOptions): ListQuery<TagRecord> {
  const queryKey = noteKeys.tags(notebookId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<TagRecord[]> => {
      const url = notebookId
        ? `/api/notes/tags?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/tags';
      const data = await api.get<TagRecord[]>(url);
      return z.array(noteTagSchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
    meta: {
      source: 'notes.hooks.useNoteTags',
      operation: 'list',
      resource: 'notes.tags',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'tags'],
    },
  });
}

export function useNoteThemes(notebookId?: string, options?: QueryOptions): ListQuery<ThemeRecord> {
  const queryKey = noteKeys.themes(notebookId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ThemeRecord[]> => {
      const url = notebookId
        ? `/api/notes/themes?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/themes';
      const data = await api.get<ThemeRecord[]>(url);
      return z.array(noteThemeSchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
    meta: {
      source: 'notes.hooks.useNoteThemes',
      operation: 'list',
      resource: 'notes.themes',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'themes'],
    },
  });
}

export function useNoteCategories(
  notebookId?: string | null,
  options?: QueryOptions
): ListQuery<CategoryRecord> {
  const queryKey = noteKeys.categories(notebookId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<CategoryRecord[]> => {
      const url = notebookId
        ? `/api/notes/categories?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/categories';
      const data = await api.get<CategoryRecord[]>(url);
      return z.array(noteCategorySchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
    meta: {
      source: 'notes.hooks.useNoteCategories',
      operation: 'list',
      resource: 'notes.categories',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'categories'],
    },
  });
}

export function useNotes(
  params: FetchNotesParams,
  options?: QueryOptions
): ListQuery<NoteWithRelations> {
  const queryKey = noteKeys.list(params);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<NoteWithRelations[]> => {
      const queryParams = params as unknown as Record<
        string,
        string | number | boolean | undefined
      >;
      const data = await api.get<NoteWithRelations[]>('/api/notes', {
        params: queryParams,
      });
      return z.array(noteWithRelationsSchema).parse(data) as unknown as NoteWithRelations[];
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
    meta: {
      source: 'notes.hooks.useNotes',
      operation: 'list',
      resource: 'notes',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'list'],
    },
  });
}

export function useNote(
  noteId: string | null,
  options?: QueryOptions
): SingleQuery<NoteWithRelations | null> {
  const queryKey = noteKeys.detail(noteId || 'none');
  return createSingleQueryV2({
    id: noteId,
    queryKey,
    queryFn: async (): Promise<NoteWithRelations | null> => {
      if (!noteId) return null;
      const data = await api.get<NoteWithRelations>(`/api/notes/${noteId}`);
      return noteWithRelationsSchema.nullable().parse(data) as unknown as NoteWithRelations | null;
    },
    staleTime: NOTES_STALE_MS,
    enabled: (options?.enabled ?? true) && !!noteId,
    meta: {
      source: 'notes.hooks.useNote',
      operation: 'detail',
      resource: 'notes.detail',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'detail'],
    },
  });
}

export function useNotesLookup(noteIds: string[], options?: QueryOptions): ListQuery<RelatedNote> {
  const filteredIds = noteIds.filter(Boolean);
  const queryKey = noteKeys.lookup(filteredIds);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<RelatedNote[]> => {
      if (filteredIds.length === 0) return [];
      const data = await api.get<RelatedNote[]>('/api/notes/lookup', {
        params: { ids: filteredIds.join(',') },
      });
      return z.array(relatedNoteSchema).parse(data);
    },
    staleTime: NOTES_STALE_MS,
    enabled: (options?.enabled ?? true) && filteredIds.length > 0,
    meta: {
      source: 'notes.hooks.useNotesLookup',
      operation: 'list',
      resource: 'notes.lookup',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'lookup'],
    },
  });
}
