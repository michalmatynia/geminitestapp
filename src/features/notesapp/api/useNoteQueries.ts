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
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { noteKeys } from '@/shared/lib/query-key-exports';

export type { FetchNotesParams };
export * from './useNotebookResource';

const NOTES_STALE_MS = 10_000;

type QueryOptions = {
  enabled?: boolean;
};

const createNoteQuery = <T>(
  queryKey: string[],
  fetchFn: () => Promise<T[]>,
  resource: string,
  options?: QueryOptions
): ListQuery<T> =>
  createListQueryV2({
    queryKey,
    queryFn: fetchFn,
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
    meta: {
      source: `notes.queries.use${resource}`,
      operation: 'list',
      resource: `notes.${resource.toLowerCase()}`,
      domain: 'notes',
      queryKey,
      tags: ['notes', resource.toLowerCase()],
      description: `Loads notes ${resource.toLowerCase()}.`,
    },
  });

export function useNoteTags(notebookId?: string, options?: QueryOptions): ListQuery<TagRecord> {
  return createNoteQuery(
    noteKeys.tags(notebookId),
    async () => {
      const url = (notebookId !== undefined && notebookId !== '') 
        ? `/api/notes/tags?notebookId=${encodeURIComponent(notebookId)}` 
        : '/api/notes/tags';
      return z.array(noteTagSchema).parse(await api.get<TagRecord[]>(url));
    },
    'Tags',
    options
  );
}

export function useNoteThemes(notebookId?: string, options?: QueryOptions): ListQuery<ThemeRecord> {
  return createNoteQuery(
    noteKeys.themes(notebookId),
    async () => {
      const url = (notebookId !== undefined && notebookId !== '') 
        ? `/api/notes/themes?notebookId=${encodeURIComponent(notebookId)}` 
        : '/api/notes/themes';
      return z.array(noteThemeSchema).parse(await api.get<ThemeRecord[]>(url));
    },
    'Themes',
    options
  );
}

export function useNoteCategories(notebookId?: string | null, options?: QueryOptions): ListQuery<CategoryRecord> {
  return createNoteQuery(
    noteKeys.categories(notebookId ?? undefined),
    async () => {
      const url = (notebookId !== undefined && notebookId !== null && notebookId !== '') 
        ? `/api/notes/categories?notebookId=${encodeURIComponent(notebookId)}` 
        : '/api/notes/categories';
      return z.array(noteCategorySchema).parse(await api.get<CategoryRecord[]>(url));
    },
    'Categories',
    options
  );
}

const appendCsvParam = (search: URLSearchParams, key: string, values: string[] | undefined): void => {
  const normalizedValues = values?.map((val) => val.trim()).filter((val) => val !== '') ?? [];
  if (normalizedValues.length > 0) search.set(key, normalizedValues.join(','));
};

const buildNotesUrl = (params: FetchNotesParams): string => {
  const search = new URLSearchParams();
  const stringParams: (keyof Pick<FetchNotesParams, 'notebookId' | 'search' | 'searchScope'>)[] = ['notebookId', 'search', 'searchScope'];
  const booleanParams: (keyof Pick<FetchNotesParams, 'isPinned' | 'isArchived' | 'isFavorite' | 'truncateContent'>)[] = ['isPinned', 'isArchived', 'isFavorite', 'truncateContent'];

  stringParams.forEach((key) => {
    const val = params[key];
    if (val !== null && val !== undefined && val !== '') search.set(key, val);
  });
  booleanParams.forEach((key) => {
    if (params[key] === true) {
      search.set(key, 'true');
    }
  });

  appendCsvParam(search, 'categoryIds', params.categoryIds);
  appendCsvParam(search, 'tagIds', params.tagIds);
  const query = search.toString();
  return query !== '' ? `/api/notes?${query}` : '/api/notes';
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
      description: 'Loads notes list.',
    },
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
      description: 'Loads single note detail.',
    },
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
      description: 'Loads related notes.',
    },
  });
}

export function useNotesLookup(noteIds: string[], options?: QueryOptions): ListQuery<RelatedNote> {
  const ids = noteIds.filter((id) => typeof id === 'string' && id.trim() !== '');
  const queryKey = noteKeys.lookup(ids);

  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<RelatedNote[]> => {
      if (ids.length === 0) return [];
      const data = await api.get<RelatedNote[]>('/api/notes/lookup', {
        params: { ids: ids.join(',') },
      });
      return z.array(relatedNoteSchema).parse(data);
    },
    enabled: (options?.enabled ?? true) && ids.length > 0,
    staleTime: NOTES_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'notes.queries.useNotesLookup',
      operation: 'list',
      resource: 'notes.lookup',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'lookup'],
      description: 'Loads note lookup results for a list of ids.',
    },
  });
}
