'use client';

import type {
  NoteWithRelationsDto as NoteWithRelations,
  CreateNoteDto as NoteCreateInput,
  UpdateNoteDto as NoteUpdateInput,
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
import type { DeleteResponse } from '@/shared/contracts/ui';
import type { CreateMutation, UpdateMutation, DeleteMutation } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useCreateNote(): CreateMutation<NoteWithRelations, NoteCreateInput> {
  const mutationKey = QUERY_KEYS.notes.all;
  return createCreateMutationV2({
    mutationFn: (payload: NoteCreateInput) => api.post<NoteWithRelations>('/api/notes', payload),
    mutationKey,
    meta: {
      source: 'notes.hooks.useCreateNote',
      operation: 'create',
      resource: 'notes',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'create'],
    },
    invalidateKeys: [QUERY_KEYS.notes.all],
  });
}

export function useUpdateNote(): UpdateMutation<
  NoteWithRelations,
  NoteUpdateInput & { id: string }
  > {
  const mutationKey = QUERY_KEYS.notes.all;
  return createUpdateMutationV2({
    mutationFn: ({ id, ...data }: NoteUpdateInput & { id: string }) =>
      api.patch<NoteWithRelations>(`/api/notes/${id}`, data),
    mutationKey,
    meta: {
      source: 'notes.hooks.useUpdateNote',
      operation: 'update',
      resource: 'notes',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'update'],
    },
    invalidateKeys: (_data, variables) => [
      QUERY_KEYS.notes.all,
      QUERY_KEYS.notes.detail(variables.id),
    ],
  });
}

export function useDeleteNote(): DeleteMutation<DeleteResponse> {
  const mutationKey = QUERY_KEYS.notes.all;
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/${id}`),
    mutationKey,
    meta: {
      source: 'notes.hooks.useDeleteNote',
      operation: 'delete',
      resource: 'notes',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'delete'],
    },
    invalidateKeys: [QUERY_KEYS.notes.all],
  });
}

export function useCreateNoteFolder(): CreateMutation<CategoryRecord, CategoryCreateInput> {
  const mutationKey = QUERY_KEYS.notes.all;
  return createCreateMutationV2({
    mutationFn: (payload: CategoryCreateInput) =>
      api.post<CategoryRecord>('/api/notes/categories', payload),
    mutationKey,
    meta: {
      source: 'notes.hooks.useCreateNoteFolder',
      operation: 'create',
      resource: 'notes.categories',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'folders', 'create'],
    },
    invalidateKeys: [QUERY_KEYS.notes.all],
  });
}

export function useUpdateNoteFolder(): UpdateMutation<
  CategoryRecord,
  CategoryUpdateInput & { id: string }
  > {
  const mutationKey = QUERY_KEYS.notes.all;
  return createUpdateMutationV2({
    mutationFn: ({ id, ...data }: CategoryUpdateInput & { id: string }) =>
      api.patch<CategoryRecord>(`/api/notes/categories/${id}`, data),
    mutationKey,
    meta: {
      source: 'notes.hooks.useUpdateNoteFolder',
      operation: 'update',
      resource: 'notes.categories',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'folders', 'update'],
    },
    invalidateKeys: [QUERY_KEYS.notes.all],
  });
}

export function useDeleteNoteFolder(): DeleteMutation<DeleteResponse> {
  const mutationKey = QUERY_KEYS.notes.all;
  return createDeleteMutationV2({
    mutationFn: (folderId: string) =>
      api.delete<DeleteResponse>(`/api/notes/categories/${folderId}`),
    mutationKey,
    meta: {
      source: 'notes.hooks.useDeleteNoteFolder',
      operation: 'delete',
      resource: 'notes.categories',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'folders', 'delete'],
    },
    invalidateKeys: [QUERY_KEYS.notes.all],
  });
}

export function useCreateNotebook(): CreateMutation<NotebookRecord, NotebookCreateInput> {
  const mutationKey = QUERY_KEYS.notes.notebooks();
  return createCreateMutationV2({
    mutationFn: (payload: NotebookCreateInput) =>
      api.post<NotebookRecord>('/api/notes/notebooks', payload),
    mutationKey,
    meta: {
      source: 'notes.hooks.useCreateNotebook',
      operation: 'create',
      resource: 'notes.notebooks',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'notebooks', 'create'],
    },
    invalidateKeys: [QUERY_KEYS.notes.notebooks()],
  });
}

export function useUpdateNotebook(): UpdateMutation<
  NotebookRecord,
  NotebookUpdateInput & { id: string }
  > {
  const mutationKey = QUERY_KEYS.notes.notebooks();
  return createUpdateMutationV2({
    mutationFn: ({ id, ...payload }: NotebookUpdateInput & { id: string }) =>
      api.patch<NotebookRecord>(`/api/notes/notebooks/${id}`, payload),
    mutationKey,
    meta: {
      source: 'notes.hooks.useUpdateNotebook',
      operation: 'update',
      resource: 'notes.notebooks',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'notebooks', 'update'],
    },
    invalidateKeys: (_data, variables) => [
      QUERY_KEYS.notes.notebooks(),
      QUERY_KEYS.notes.detail(variables.id),
    ],
  });
}

export function useDeleteNotebook(): DeleteMutation<DeleteResponse> {
  const mutationKey = QUERY_KEYS.notes.notebooks();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/notebooks/${id}`),
    mutationKey,
    meta: {
      source: 'notes.hooks.useDeleteNotebook',
      operation: 'delete',
      resource: 'notes.notebooks',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'notebooks', 'delete'],
    },
    invalidateKeys: [QUERY_KEYS.notes.all],
  });
}

export function useCreateNoteTag(): CreateMutation<TagRecord, TagCreateInput> {
  const mutationKey = QUERY_KEYS.notes.tags();
  return createCreateMutationV2({
    mutationFn: (payload: TagCreateInput) => api.post<TagRecord>('/api/notes/tags', payload),
    mutationKey,
    meta: {
      source: 'notes.hooks.useCreateNoteTag',
      operation: 'create',
      resource: 'notes.tags',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'tags', 'create'],
    },
    invalidateKeys: (_data, variables) => [
      QUERY_KEYS.notes.tags(),
      QUERY_KEYS.notes.tags(variables.notebookId ?? undefined),
    ],
  });
}

export function useUpdateNoteTag(): UpdateMutation<TagRecord, TagUpdateInput & { id: string }> {
  const mutationKey = QUERY_KEYS.notes.tags();
  return createUpdateMutationV2({
    mutationFn: ({ id, ...data }: TagUpdateInput & { id: string }) =>
      api.patch<TagRecord>(`/api/notes/tags/${id}`, data),
    mutationKey,
    meta: {
      source: 'notes.hooks.useUpdateNoteTag',
      operation: 'update',
      resource: 'notes.tags',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'tags', 'update'],
    },
    invalidateKeys: [QUERY_KEYS.notes.tags()],
  });
}

export function useDeleteNoteTag(): DeleteMutation<DeleteResponse> {
  const mutationKey = QUERY_KEYS.notes.tags();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/tags/${id}`),
    mutationKey,
    meta: {
      source: 'notes.hooks.useDeleteNoteTag',
      operation: 'delete',
      resource: 'notes.tags',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'tags', 'delete'],
    },
    invalidateKeys: [QUERY_KEYS.notes.tags()],
  });
}

export function useCreateNoteTheme(): CreateMutation<ThemeRecord, ThemeCreateInput> {
  const mutationKey = QUERY_KEYS.notes.themes();
  return createCreateMutationV2({
    mutationFn: (payload: ThemeCreateInput) => api.post<ThemeRecord>('/api/notes/themes', payload),
    mutationKey,
    meta: {
      source: 'notes.hooks.useCreateNoteTheme',
      operation: 'create',
      resource: 'notes.themes',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'themes', 'create'],
    },
    invalidateKeys: (_data, variables) => [
      QUERY_KEYS.notes.themes(),
      QUERY_KEYS.notes.themes(variables.notebookId ?? undefined),
    ],
  });
}

export function useUpdateNoteTheme(): UpdateMutation<
  ThemeRecord,
  ThemeUpdateInput & { id: string }
  > {
  const mutationKey = QUERY_KEYS.notes.themes();
  return createUpdateMutationV2({
    mutationFn: ({ id, ...data }: ThemeUpdateInput & { id: string }) =>
      api.patch<ThemeRecord>(`/api/notes/themes/${id}`, data),
    mutationKey,
    meta: {
      source: 'notes.hooks.useUpdateNoteTheme',
      operation: 'update',
      resource: 'notes.themes',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'themes', 'update'],
    },
    invalidateKeys: [QUERY_KEYS.notes.themes()],
  });
}

export function useDeleteNoteTheme(): DeleteMutation<DeleteResponse> {
  const mutationKey = QUERY_KEYS.notes.themes();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/themes/${id}`),
    mutationKey,
    meta: {
      source: 'notes.hooks.useDeleteNoteTheme',
      operation: 'delete',
      resource: 'notes.themes',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'themes', 'delete'],
    },
    invalidateKeys: [QUERY_KEYS.notes.themes()],
  });
}
