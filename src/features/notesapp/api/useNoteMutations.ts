'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import {
  createCreateMutation,
  createUpdateMutation,
  createDeleteMutation,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { DeleteResponse } from '@/shared/types/api/api';
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
} from '@/shared/types/domain/notes';
import type { 
  CreateMutation, 
  UpdateMutation, 
  DeleteMutation 
} from '@/shared/types/query-result-types';


export function useCreateNote(): CreateMutation<NoteWithRelations, NoteCreateInput> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (payload: NoteCreateInput) => api.post<NoteWithRelations>('/api/notes', payload),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
      },
    },
  });
}

export function useUpdateNote(): UpdateMutation<NoteWithRelations, NoteUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, ...data }: NoteUpdateInput & { id: string }) =>
      api.patch<NoteWithRelations>(`/api/notes/${id}`, data),
    options: {
      onSuccess: (_data, variables) => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(variables.id) });
      },
    },
  });
}

export function useDeleteNote(): DeleteMutation<DeleteResponse> {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/${id}`),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
      },
    },
  });
}

export function useCreateNoteFolder(): CreateMutation<CategoryRecord, CategoryCreateInput> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (payload: CategoryCreateInput) =>
      api.post<CategoryRecord>('/api/notes/categories', payload),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
      },
    },
  });
}

export function useUpdateNoteFolder(): UpdateMutation<CategoryRecord, CategoryUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, ...data }: CategoryUpdateInput & { id: string }) =>
      api.patch<CategoryRecord>(`/api/notes/categories/${id}`, data),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
      },
    },
  });
}

export function useDeleteNoteFolder(): DeleteMutation<DeleteResponse> {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: (folderId: string) =>
      api.delete<DeleteResponse>(`/api/notes/categories/${folderId}`),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
      },
    },
  });
}

export function useCreateNotebook(): CreateMutation<NotebookRecord, NotebookCreateInput> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (payload: NotebookCreateInput) => api.post<NotebookRecord>('/api/notes/notebooks', payload),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.notebooks() });
      },
    },
  });
}

export function useUpdateNotebook(): UpdateMutation<NotebookRecord, NotebookUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, ...data }: NotebookUpdateInput & { id: string }) =>
      api.patch<NotebookRecord>(`/api/notes/notebooks/${id}`, data),
    options: {
      onSuccess: (_data, variables) => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.notebooks() });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(variables.id) });
      },
    },
  });
}

export function useDeleteNotebook(): DeleteMutation<DeleteResponse> {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/notebooks/${id}`),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
      },
    },
  });
}

export function useCreateNoteTag(): CreateMutation<TagRecord, TagCreateInput> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (payload: TagCreateInput) =>
      api.post<TagRecord>('/api/notes/tags', payload),
    options: {
      onSuccess: (_data, variables) => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags() });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags(variables.notebookId ?? undefined) });
      },
    },
  });
}

export function useUpdateNoteTag(): UpdateMutation<TagRecord, TagUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, ...data }: TagUpdateInput & { id: string }) =>
      api.patch<TagRecord>(`/api/notes/tags/${id}`, data),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags() });
      },
    },
  });
}

export function useDeleteNoteTag(): DeleteMutation<DeleteResponse> {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/tags/${id}`),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags() });
      },
    },
  });
}

export function useCreateNoteTheme(): CreateMutation<ThemeRecord, ThemeCreateInput> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (payload: ThemeCreateInput) =>
      api.post<ThemeRecord>('/api/notes/themes', payload),
    options: {
      onSuccess: (_data, variables) => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes() });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes(variables.notebookId ?? undefined) });
      },
    },
  });
}

export function useUpdateNoteTheme(): UpdateMutation<ThemeRecord, ThemeUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, ...data }: ThemeUpdateInput & { id: string }) =>
      api.patch<ThemeRecord>(`/api/notes/themes/${id}`, data),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes() });
      },
    },
  });
}

export function useDeleteNoteTheme(): DeleteMutation<DeleteResponse> {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/themes/${id}`),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes() });
      },
    },
  });
}
