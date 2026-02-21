'use client';

import { useQueryClient } from '@tanstack/react-query';

import type {
  NoteWithRelationsDto as NoteWithRelations,
  CreateNoteDto as NoteCreateInput,
  UpdateNoteDto as NoteUpdateInput,
  NoteCategoryDto as CategoryRecord,
  CreateNoteCategoryDto as CategoryCreateInput,
  UpdateNoteCategoryDto as CategoryUpdateInput,
  NotebookDto as NotebookRecord,
  CreateNotebookDto as NotebookCreateInput,
  UpdateNotebookDto as NotebookUpdateInput,
  NoteTagDto as TagRecord,
  CreateNoteTagDto as TagCreateInput,
  UpdateNoteTagDto as TagUpdateInput,
  NoteThemeDto as ThemeRecord,
  CreateNoteThemeDto as ThemeCreateInput,
  UpdateNoteThemeDto as ThemeUpdateInput,
} from '@/shared/contracts/notes';
import type { DeleteResponse } from '@/shared/contracts/ui';
import type { 
  CreateMutation, 
  UpdateMutation, 
  DeleteMutation 
} from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';


export function useCreateNote(): CreateMutation<NoteWithRelations, NoteCreateInput> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.all;
  return createCreateMutationV2({
    mutationFn: (payload: NoteCreateInput) => api.post<NoteWithRelations>('/api/notes', payload),
    mutationKey,
    meta: {
      source: 'notes.hooks.useCreateNote',
      operation: 'create',
      resource: 'notes',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'create'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useUpdateNote(): UpdateMutation<NoteWithRelations, NoteUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.all;
  return createUpdateMutationV2({
    mutationFn: ({ id, ...data }: NoteUpdateInput & { id: string }) =>
      api.patch<NoteWithRelations>(`/api/notes/${id}`, data),
    mutationKey,
    meta: {
      source: 'notes.hooks.useUpdateNote',
      operation: 'update',
      resource: 'notes',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'update'],
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(variables.id) });
    },
  });
}

export function useDeleteNote(): DeleteMutation<DeleteResponse> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.all;
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/${id}`),
    mutationKey,
    meta: {
      source: 'notes.hooks.useDeleteNote',
      operation: 'delete',
      resource: 'notes',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useCreateNoteFolder(): CreateMutation<CategoryRecord, CategoryCreateInput> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.all;
  return createCreateMutationV2({
    mutationFn: (payload: CategoryCreateInput) =>
      api.post<CategoryRecord>('/api/notes/categories', payload),
    mutationKey,
    meta: {
      source: 'notes.hooks.useCreateNoteFolder',
      operation: 'create',
      resource: 'notes.categories',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'folders', 'create'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useUpdateNoteFolder(): UpdateMutation<CategoryRecord, CategoryUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.all;
  return createUpdateMutationV2({
    mutationFn: ({ id, ...data }: CategoryUpdateInput & { id: string }) =>
      api.patch<CategoryRecord>(`/api/notes/categories/${id}`, data),
    mutationKey,
    meta: {
      source: 'notes.hooks.useUpdateNoteFolder',
      operation: 'update',
      resource: 'notes.categories',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'folders', 'update'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useDeleteNoteFolder(): DeleteMutation<DeleteResponse> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.all;
  return createDeleteMutationV2({
    mutationFn: (folderId: string) =>
      api.delete<DeleteResponse>(`/api/notes/categories/${folderId}`),
    mutationKey,
    meta: {
      source: 'notes.hooks.useDeleteNoteFolder',
      operation: 'delete',
      resource: 'notes.categories',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'folders', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useCreateNotebook(): CreateMutation<NotebookRecord, NotebookCreateInput> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.notebooks();
  return createCreateMutationV2({
    mutationFn: (payload: NotebookCreateInput) => api.post<NotebookRecord>('/api/notes/notebooks', payload),
    mutationKey,
    meta: {
      source: 'notes.hooks.useCreateNotebook',
      operation: 'create',
      resource: 'notes.notebooks',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'notebooks', 'create'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.notebooks() });
    },
  });
}

export function useUpdateNotebook(): UpdateMutation<NotebookRecord, NotebookUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.notebooks();
  return createUpdateMutationV2({
    mutationFn: ({ id, ...data }: NotebookUpdateInput & { id: string }) =>
      api.patch<NotebookRecord>(`/api/notes/notebooks/${id}`, data),
    mutationKey,
    meta: {
      source: 'notes.hooks.useUpdateNotebook',
      operation: 'update',
      resource: 'notes.notebooks',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'notebooks', 'update'],
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.notebooks() });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(variables.id) });
    },
  });
}

export function useDeleteNotebook(): DeleteMutation<DeleteResponse> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.notebooks();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/notebooks/${id}`),
    mutationKey,
    meta: {
      source: 'notes.hooks.useDeleteNotebook',
      operation: 'delete',
      resource: 'notes.notebooks',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'notebooks', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useCreateNoteTag(): CreateMutation<TagRecord, TagCreateInput> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.tags();
  return createCreateMutationV2({
    mutationFn: (payload: TagCreateInput) =>
      api.post<TagRecord>('/api/notes/tags', payload),
    mutationKey,
    meta: {
      source: 'notes.hooks.useCreateNoteTag',
      operation: 'create',
      resource: 'notes.tags',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'tags', 'create'],
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags() });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags(variables.notebookId ?? undefined) });
    },
  });
}

export function useUpdateNoteTag(): UpdateMutation<TagRecord, TagUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.tags();
  return createUpdateMutationV2({
    mutationFn: ({ id, ...data }: TagUpdateInput & { id: string }) =>
      api.patch<TagRecord>(`/api/notes/tags/${id}`, data),
    mutationKey,
    meta: {
      source: 'notes.hooks.useUpdateNoteTag',
      operation: 'update',
      resource: 'notes.tags',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'tags', 'update'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags() });
    },
  });
}

export function useDeleteNoteTag(): DeleteMutation<DeleteResponse> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.tags();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/tags/${id}`),
    mutationKey,
    meta: {
      source: 'notes.hooks.useDeleteNoteTag',
      operation: 'delete',
      resource: 'notes.tags',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'tags', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags() });
    },
  });
}

export function useCreateNoteTheme(): CreateMutation<ThemeRecord, ThemeCreateInput> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.themes();
  return createCreateMutationV2({
    mutationFn: (payload: ThemeCreateInput) =>
      api.post<ThemeRecord>('/api/notes/themes', payload),
    mutationKey,
    meta: {
      source: 'notes.hooks.useCreateNoteTheme',
      operation: 'create',
      resource: 'notes.themes',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'themes', 'create'],
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes() });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes(variables.notebookId ?? undefined) });
    },
  });
}

export function useUpdateNoteTheme(): UpdateMutation<ThemeRecord, ThemeUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.themes();
  return createUpdateMutationV2({
    mutationFn: ({ id, ...data }: ThemeUpdateInput & { id: string }) =>
      api.patch<ThemeRecord>(`/api/notes/themes/${id}`, data),
    mutationKey,
    meta: {
      source: 'notes.hooks.useUpdateNoteTheme',
      operation: 'update',
      resource: 'notes.themes',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'themes', 'update'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes() });
    },
  });
}

export function useDeleteNoteTheme(): DeleteMutation<DeleteResponse> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.themes();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/themes/${id}`),
    mutationKey,
    meta: {
      source: 'notes.hooks.useDeleteNoteTheme',
      operation: 'delete',
      resource: 'notes.themes',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'themes', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes() });
    },
  });
}
