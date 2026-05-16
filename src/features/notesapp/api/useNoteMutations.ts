import { type QueryKey, type UseMutationResult } from '@tanstack/react-query';
import type {
  NoteWithRelations,
  NoteCreateInput,
  NoteUpdateInput,
  CategoryRecord,
  CategoryCreateInput,
  CategoryUpdateInput,
  NotebookRecord,
  NotebookCreateInput,
  NotebookUpdateInput,
  TagRecord,
  TagCreateInput,
  TagUpdateInput,
  ThemeRecord,
  ThemeCreateInput,
  ThemeUpdateInput,
} from '@/shared/contracts/notes';
import type { DeleteResponse } from '@/shared/contracts/ui/api';
import { api } from '@/shared/lib/api-client';
import {
  useCreateMutationV2,
  useDeleteMutationV2,
  useUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type QueryInvalidationFn<T, U> = (
  data: T,
  vars: U,
  context: unknown
) => readonly QueryKey[];
type QueryInvalidation<T, U> = readonly QueryKey[] | QueryInvalidationFn<T, U>;
type MutationConfig<T, U> = {
  path: string;
  resource: string;
  mutationKey: QueryKey;
  invalidate?: QueryInvalidation<T, U>;
};

const DEFAULT_NOTE_INVALIDATIONS = [QUERY_KEYS.notes.all] as const satisfies readonly QueryKey[];

const createNoteCreateMutation = <T, U>(
  config: MutationConfig<T, U>
): UseMutationResult<T, Error, U> =>
  useCreateMutationV2<T, U>({
    mutationFn: (payload: U) => api.post<T>(config.path, payload),
    mutationKey: config.mutationKey,
    meta: {
      source: `notes.hooks.create${config.resource}`,
      operation: 'create',
      resource: config.resource,
      domain: 'notes',
      description: `Creates ${config.resource}.`,
    },
    invalidateKeys: config.invalidate ?? DEFAULT_NOTE_INVALIDATIONS,
  });

const createNoteUpdateMutation = <T, U>(
  config: MutationConfig<T, U & { id: string }>
): UseMutationResult<T, Error, U & { id: string }> =>
  useUpdateMutationV2<T, U & { id: string }>({
    mutationFn: ({ id, ...data }: U & { id: string }) => api.patch<T>(`${config.path}/${id}`, data),
    mutationKey: config.mutationKey,
    meta: {
      source: `notes.hooks.update${config.resource}`,
      operation: 'update',
      resource: config.resource,
      domain: 'notes',
      description: `Updates ${config.resource}.`,
    },
    invalidateKeys: config.invalidate ?? DEFAULT_NOTE_INVALIDATIONS,
  });

const createNoteDeleteMutation = (
  config: MutationConfig<DeleteResponse, string>
): UseMutationResult<DeleteResponse, Error, string> =>
  useDeleteMutationV2<DeleteResponse, string>({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`${config.path}/${id}`),
    mutationKey: config.mutationKey,
    meta: {
      source: `notes.hooks.delete${config.resource}`,
      operation: 'delete',
      resource: config.resource,
      domain: 'notes',
      description: `Deletes ${config.resource}.`,
    },
    invalidateKeys: config.invalidate ?? DEFAULT_NOTE_INVALIDATIONS,
  });

export const useCreateNote = (): UseMutationResult<NoteWithRelations, Error, NoteCreateInput> => createNoteCreateMutation<NoteWithRelations, NoteCreateInput>({ path: '/api/notes', resource: 'notes', mutationKey: QUERY_KEYS.notes.all });
export const useUpdateNote = (): UseMutationResult<NoteWithRelations, Error, NoteUpdateInput & { id: string }> => useUpdateMutationV2<NoteWithRelations, NoteUpdateInput & { id: string }>({
    mutationFn: ({ id, ...data }: NoteUpdateInput & { id: string }) => api.patch<NoteWithRelations>(`/api/notes/${id}`, data),
    mutationKey: QUERY_KEYS.notes.all,
    meta: { source: 'notes.hooks.useUpdateNote', operation: 'update', resource: 'notes', domain: 'notes', mutationKey: QUERY_KEYS.notes.all, tags: ['notes', 'update'], description: 'Updates notes.'},
    invalidateKeys: (_d, vars) => [QUERY_KEYS.notes.all, QUERY_KEYS.notes.detail(vars.id)],
});
export const useDeleteNote = (): UseMutationResult<DeleteResponse, Error, string> => createNoteDeleteMutation({ path: '/api/notes', resource: 'notes', mutationKey: QUERY_KEYS.notes.all });

export const useCreateNoteFolder = (): UseMutationResult<CategoryRecord, Error, CategoryCreateInput> => createNoteCreateMutation<CategoryRecord, CategoryCreateInput>({ path: '/api/notes/categories', resource: 'categories', mutationKey: QUERY_KEYS.notes.all });
export const useUpdateNoteFolder = (): UseMutationResult<CategoryRecord, Error, CategoryUpdateInput & { id: string }> => createNoteUpdateMutation<CategoryRecord, CategoryUpdateInput>({ path: '/api/notes/categories', resource: 'categories', mutationKey: QUERY_KEYS.notes.all });
export const useDeleteNoteFolder = (): UseMutationResult<DeleteResponse, Error, string> => createNoteDeleteMutation({ path: '/api/notes/categories', resource: 'categories', mutationKey: QUERY_KEYS.notes.all });

export const useCreateNotebook = (): UseMutationResult<NotebookRecord, Error, NotebookCreateInput> => createNoteCreateMutation<NotebookRecord, NotebookCreateInput>({ path: '/api/notes/notebooks', resource: 'notebooks', mutationKey: QUERY_KEYS.notes.notebooks() });
export const useUpdateNotebook = (): UseMutationResult<NotebookRecord, Error, NotebookUpdateInput & { id: string }> => useUpdateMutationV2<NotebookRecord, NotebookUpdateInput & { id: string }>({
    mutationFn: ({ id, ...data }: NotebookUpdateInput & { id: string }) => api.patch<NotebookRecord>(`/api/notes/notebooks/${id}`, data),
    mutationKey: QUERY_KEYS.notes.notebooks(),
    meta: { source: 'notes.hooks.useUpdateNotebook', operation: 'update', resource: 'notebooks', domain: 'notes', mutationKey: QUERY_KEYS.notes.notebooks(), tags: ['notes', 'notebooks', 'update'], description: 'Updates notes notebooks.'},
    invalidateKeys: (_d, vars) => [QUERY_KEYS.notes.notebooks(), QUERY_KEYS.notes.detail(vars.id)],
});
export const useDeleteNotebook = (): UseMutationResult<DeleteResponse, Error, string> => createNoteDeleteMutation({ path: '/api/notes/notebooks', resource: 'notebooks', mutationKey: QUERY_KEYS.notes.notebooks() });

export const useCreateNoteTag = (): UseMutationResult<TagRecord, Error, TagCreateInput> => createNoteCreateMutation<TagRecord, TagCreateInput>({ path: '/api/notes/tags', resource: 'tags', mutationKey: QUERY_KEYS.notes.tags(), invalidate: (_d, v) => [QUERY_KEYS.notes.tags(), QUERY_KEYS.notes.tags(v.notebookId ?? undefined)] });
export const useUpdateNoteTag = (): UseMutationResult<TagRecord, Error, TagUpdateInput & { id: string }> => createNoteUpdateMutation<TagRecord, TagUpdateInput>({ path: '/api/notes/tags', resource: 'tags', mutationKey: QUERY_KEYS.notes.tags() });
export const useDeleteNoteTag = (): UseMutationResult<DeleteResponse, Error, string> => createNoteDeleteMutation({ path: '/api/notes/tags', resource: 'tags', mutationKey: QUERY_KEYS.notes.tags() });

export const useCreateNoteTheme = (): UseMutationResult<ThemeRecord, Error, ThemeCreateInput> => createNoteCreateMutation<ThemeRecord, ThemeCreateInput>({ path: '/api/notes/themes', resource: 'themes', mutationKey: QUERY_KEYS.notes.themes(), invalidate: (_d, v) => [QUERY_KEYS.notes.themes(), QUERY_KEYS.notes.themes(v.notebookId ?? undefined)] });
export const useUpdateNoteTheme = (): UseMutationResult<ThemeRecord, Error, ThemeUpdateInput & { id: string }> => createNoteUpdateMutation<ThemeRecord, ThemeUpdateInput>({ path: '/api/notes/themes', resource: 'themes', mutationKey: QUERY_KEYS.notes.themes() });
export const useDeleteNoteTheme = (): UseMutationResult<DeleteResponse, Error, string> => createNoteDeleteMutation({ path: '/api/notes/themes', resource: 'themes', mutationKey: QUERY_KEYS.notes.themes() });
