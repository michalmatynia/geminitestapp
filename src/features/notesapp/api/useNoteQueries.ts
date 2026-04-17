import { z } from 'zod';

import {
  noteWithRelationsSchema,
  noteTagSchema,
  noteThemeSchema,
  noteCategorySchema,
  relatedNoteSchema,
} from '@/shared/contracts/notes';
import type {
  CategoryRecord,
  NoteWithRelations,
  TagRecord,
  ThemeRecord,
  RelatedNote,
  FetchNotesParams,
} from '@/shared/contracts/notes';
export type { FetchNotesParams };
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { noteKeys } from '@/shared/lib/query-key-exports';

export * from './useNotebookResource';
const NOTES_STALE_MS = 10_000;

type QueryOptions = {
  enabled?: boolean;
};

export function useNoteTags(notebookId?: string, options?: QueryOptions): ListQuery<TagRecord> {
  const queryKey = noteKeys.tags(notebookId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<TagRecord[]> => {
      const url = notebookId !== undefined && notebookId !== ''
        ? `/api/notes/tags?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/tags';
      const data = await api.get<TagRecord[]>(url);
      return z.array(noteTagSchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
    meta: {
      source: 'notes.queries.useNoteTags',
      operation: 'list',
      resource: 'notes.tags',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'tags'],
      description: 'Loads notes tags.'},
  });
}

export function useNoteThemes(notebookId?: string, options?: QueryOptions): ListQuery<ThemeRecord> {
  const queryKey = noteKeys.themes(notebookId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ThemeRecord[]> => {
      const url = notebookId !== undefined && notebookId !== ''
        ? `/api/notes/themes?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/themes';
      const data = await api.get<ThemeRecord[]>(url);
      return z.array(noteThemeSchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
    meta: {
      source: 'notes.queries.useNoteThemes',
      operation: 'list',
      resource: 'notes.themes',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'themes'],
      description: 'Loads notes themes.'},
  });
}

export function useNoteCategories(
  notebookId?: string | null,
  options?: QueryOptions
): ListQuery<CategoryRecord> {
  const queryKey = noteKeys.categories(notebookId ?? undefined);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<CategoryRecord[]> => {
      const url = notebookId !== undefined && notebookId !== null && notebookId !== ''
        ? `/api/notes/categories?notebookId=${encodeURIComponent(notebookId)}`
        : '/api/notes/categories';
      const data = await api.get<CategoryRecord[]>(url);
      return z.array(noteCategorySchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
    meta: {
      source: 'notes.queries.useNoteCategories',
      operation: 'list',
      resource: 'notes.categories',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'categories'],
      description: 'Loads notes categories.'},
  });
}

const buildNotesUrl = (params: FetchNotesParams): string => {
  const search = new URLSearchParams();
  if (params.categoryId !== undefined && params.categoryId !== null) search.set('categoryId', params.categoryId);
  if (params.notebookId !== undefined && params.notebookId !== null) search.set('notebookId', params.notebookId);
  if (params.tagId !== undefined && params.tagId !== null) search.set('tagId', params.tagId);
  if (params.query !== undefined && params.query !== null) search.set('query', params.query);
  if (params.favoritesOnly === true) search.set('favoritesOnly', 'true');
  if (params.archivedOnly === true) search.set('archivedOnly', 'true');
  return `/api/notes?${search.toString()}`;
};

export function useNotes(params: FetchNotesParams, options?: QueryOptions): ListQuery<NoteWithRelations> {
  const queryKey = noteKeys.list(params);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<NoteWithRelations[]> => {
      const data = await api.get<NoteWithRelations[]>(buildNotesUrl(params));
      return z.array(noteWithRelationsSchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
    meta: {
      source: 'notes.queries.useNotes',
      operation: 'list',
      resource: 'notes.list',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'list'],
      description: 'Loads notes list.'},
  });
}

export function useNote(noteId: string | null, options?: QueryOptions): SingleQuery<NoteWithRelations | null> {
  const queryKey = noteKeys.detail(noteId ?? 'none');
  return createSingleQueryV2({
    queryKey,
    queryFn: async (): Promise<NoteWithRelations | null> => {
      if (noteId === null || noteId === '') return null;
      const data = await api.get<NoteWithRelations>(`/api/notes/${noteId}`);
      return noteWithRelationsSchema.parse(data);
    },
    enabled: options?.enabled !== false && noteId !== null && noteId !== '',
    staleTime: NOTES_STALE_MS,
    meta: {
      source: 'notes.queries.useNote',
      operation: 'detail',
      resource: 'notes.detail',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'detail'],
      description: 'Loads single note detail.'},
  });
}

export function useRelatedNotes(noteId: string | null, options?: QueryOptions): ListQuery<RelatedNote> {
  const queryKey = noteKeys.related(noteId ?? 'none');
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<RelatedNote[]> => {
      if (noteId === null || noteId === '') return [];
      const data = await api.get<RelatedNote[]>(`/api/notes/${noteId}/related`);
      return z.array(relatedNoteSchema).parse(data);
    },
    enabled: options?.enabled !== false && noteId !== null && noteId !== '',
    staleTime: NOTES_STALE_MS,
    meta: {
      source: 'notes.queries.useRelatedNotes',
      operation: 'list',
      resource: 'notes.related',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'related'],
      description: 'Loads related notes.'},
  });
}
