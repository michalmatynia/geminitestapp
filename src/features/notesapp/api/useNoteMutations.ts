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
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type InvalidationFn<T, U> = (data: T, vars: U) => string[];
type MutationConfig<T, U> = {
  path: string;
  operation: 'create' | 'update' | 'delete';
  resource: string;
  mutationKey: string | string[];
  invalidate?: string[] | InvalidationFn<T, U>;
};

const createNoteMutation = <T, U>(config: MutationConfig<T, U>) => {
  const { path, operation, resource, mutationKey, invalidate = [QUERY_KEYS.notes.all] } = config;
  const meta = {
    source: `notes.hooks.${operation}${resource}`,
    operation,
    resource,
    domain: 'notes',
    mutationKey,
    tags: ['notes', resource, operation],
    description: `${operation === 'create' ? 'Creates' : operation === 'update' ? 'Updates' : 'Deletes'} ${resource}.`,
  };

  switch (operation) {
    case 'create':
      return createCreateMutationV2<T, U>({
        mutationFn: (payload: U) => api.post<T>(path, payload),
        mutationKey,
        meta,
        invalidateKeys: invalidate as string[],
      });
    case 'update':
      return createUpdateMutationV2<T, U & { id: string }>({
        mutationFn: ({ id, ...data }: U & { id: string }) => api.patch<T>(`${path}/${id}`, data),
        mutationKey,
        meta,
        invalidateKeys: invalidate as InvalidationFn<T, U & { id: string }>,
      });
    case 'delete':
      return createDeleteMutationV2<DeleteResponse, string>({
        mutationFn: (id: string) => api.delete<DeleteResponse>(`${path}/${id}`),
        mutationKey,
        meta,
        invalidateKeys: invalidate as string[],
      });
  }
};

export const useCreateNote = () => createNoteMutation<NoteWithRelations, NoteCreateInput>({ path: '/api/notes', operation: 'create', resource: 'notes', mutationKey: QUERY_KEYS.notes.all });
export const useUpdateNote = () => createUpdateMutationV2<NoteWithRelations, NoteUpdateInput & { id: string }>({
    mutationFn: ({ id, ...data }: NoteUpdateInput & { id: string }) => api.patch<NoteWithRelations>(`/api/notes/${id}`, data),
    mutationKey: QUERY_KEYS.notes.all,
    meta: { source: 'notes.hooks.useUpdateNote', operation: 'update', resource: 'notes', domain: 'notes', mutationKey: QUERY_KEYS.notes.all, tags: ['notes', 'update'], description: 'Updates notes.'},
    invalidateKeys: (_d, vars) => [QUERY_KEYS.notes.all, QUERY_KEYS.notes.detail(vars.id)],
});
export const useDeleteNote = () => createNoteMutation<DeleteResponse, string>({ path: '/api/notes', operation: 'delete', resource: 'notes', mutationKey: QUERY_KEYS.notes.all });

export const useCreateNoteFolder = () => createNoteMutation<CategoryRecord, CategoryCreateInput>({ path: '/api/notes/categories', operation: 'create', resource: 'categories', mutationKey: QUERY_KEYS.notes.all });
export const useUpdateNoteFolder = () => createNoteMutation<CategoryRecord, CategoryUpdateInput>({ path: '/api/notes/categories', operation: 'update', resource: 'categories', mutationKey: QUERY_KEYS.notes.all });
export const useDeleteNoteFolder = () => createNoteMutation<DeleteResponse, string>({ path: '/api/notes/categories', operation: 'delete', resource: 'categories', mutationKey: QUERY_KEYS.notes.all });

export const useCreateNotebook = () => createNoteMutation<NotebookRecord, NotebookCreateInput>({ path: '/api/notes/notebooks', operation: 'create', resource: 'notebooks', mutationKey: QUERY_KEYS.notes.notebooks() });
export const useUpdateNotebook = () => createUpdateMutationV2<NotebookRecord, NotebookUpdateInput & { id: string }>({
    mutationFn: ({ id, ...data }: NotebookUpdateInput & { id: string }) => api.patch<NotebookRecord>(`/api/notes/notebooks/${id}`, data),
    mutationKey: QUERY_KEYS.notes.notebooks(),
    meta: { source: 'notes.hooks.useUpdateNotebook', operation: 'update', resource: 'notebooks', domain: 'notes', mutationKey: QUERY_KEYS.notes.notebooks(), tags: ['notes', 'notebooks', 'update'], description: 'Updates notes notebooks.'},
    invalidateKeys: (_d, vars) => [QUERY_KEYS.notes.notebooks(), QUERY_KEYS.notes.detail(vars.id)],
});
export const useDeleteNotebook = () => createNoteMutation<DeleteResponse, string>({ path: '/api/notes/notebooks', operation: 'delete', resource: 'notebooks', mutationKey: QUERY_KEYS.notes.notebooks() });

export const useCreateNoteTag = () => createNoteMutation<TagRecord, TagCreateInput>({ path: '/api/notes/tags', operation: 'create', resource: 'tags', mutationKey: QUERY_KEYS.notes.tags(), invalidate: (_d, v) => [QUERY_KEYS.notes.tags(), QUERY_KEYS.notes.tags(v.notebookId ?? undefined)] });
export const useUpdateNoteTag = () => createNoteMutation<TagRecord, TagUpdateInput>({ path: '/api/notes/tags', operation: 'update', resource: 'tags', mutationKey: QUERY_KEYS.notes.tags() });
export const useDeleteNoteTag = () => createNoteMutation<DeleteResponse, string>({ path: '/api/notes/tags', operation: 'delete', resource: 'tags', mutationKey: QUERY_KEYS.notes.tags() });

export const useCreateNoteTheme = () => createNoteMutation<ThemeRecord, ThemeCreateInput>({ path: '/api/notes/themes', operation: 'create', resource: 'themes', mutationKey: QUERY_KEYS.notes.themes(), invalidate: (_d, v) => [QUERY_KEYS.notes.themes(), QUERY_KEYS.notes.themes(v.notebookId ?? undefined)] });
export const useUpdateNoteTheme = () => createNoteMutation<ThemeRecord, ThemeUpdateInput>({ path: '/api/notes/themes', operation: 'update', resource: 'themes', mutationKey: QUERY_KEYS.notes.themes() });
export const useDeleteNoteTheme = () => createNoteMutation<DeleteResponse, string>({ path: '/api/notes/themes', operation: 'delete', resource: 'themes', mutationKey: QUERY_KEYS.notes.themes() });
