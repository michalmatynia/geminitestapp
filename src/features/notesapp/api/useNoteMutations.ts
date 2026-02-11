'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
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

export function useCreateNote(): UseMutationResult<NoteWithRelations, Error, NoteCreateInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NoteCreateInput) => api.post<NoteWithRelations>('/api/notes', payload),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useUpdateNote(): UseMutationResult<NoteWithRelations, Error, NoteUpdateInput & { id: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: NoteUpdateInput & { id: string }) =>
      api.patch<NoteWithRelations>(`/api/notes/${id}`, data),
    onSuccess: (_data: NoteWithRelations, variables): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(variables.id) });
    },
  });
}

export function useDeleteNote(): UseMutationResult<DeleteResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/${id}`),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useCreateNoteFolder(): UseMutationResult<CategoryRecord, Error, CategoryCreateInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CategoryCreateInput) =>
      api.post<CategoryRecord>('/api/notes/categories', payload),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useUpdateNoteFolder(): UseMutationResult<CategoryRecord, Error, CategoryUpdateInput & { id: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: CategoryUpdateInput & { id: string }) =>
      api.patch<CategoryRecord>(`/api/notes/categories/${id}`, data),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useDeleteNoteFolder(): UseMutationResult<DeleteResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId: string) =>
      api.delete<DeleteResponse>(`/api/notes/categories/${folderId}`),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useCreateNotebook(): UseMutationResult<NotebookRecord, Error, NotebookCreateInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotebookCreateInput) => api.post<NotebookRecord>('/api/notes/notebooks', payload),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.notebooks });
    },
  });
}

export function useUpdateNotebook(): UseMutationResult<NotebookRecord, Error, NotebookUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: NotebookUpdateInput & { id: string }) =>
      api.patch<NotebookRecord>(`/api/notes/notebooks/${id}`, data),
    onSuccess: (_data, variables): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.notebooks });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(variables.id) });
    },
  });
}

export function useDeleteNotebook(): UseMutationResult<DeleteResponse, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/notebooks/${id}`),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useCreateNoteTag(): UseMutationResult<TagRecord, Error, TagCreateInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TagCreateInput) =>
      api.post<TagRecord>('/api/notes/tags', payload),
    onSuccess: (_data: TagRecord, variables: TagCreateInput): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags });
      if (variables.notebookId) {
        void queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.notes.tags, variables.notebookId] });
      }
    },
  });
}

export function useUpdateNoteTag(): UseMutationResult<TagRecord, Error, TagUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: TagUpdateInput & { id: string }) =>
      api.patch<TagRecord>(`/api/notes/tags/${id}`, data),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags });
    },
  });
}

export function useDeleteNoteTag(): UseMutationResult<DeleteResponse, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/tags/${id}`),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.tags });
    },
  });
}

export function useCreateNoteTheme(): UseMutationResult<ThemeRecord, Error, ThemeCreateInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ThemeCreateInput) =>
      api.post<ThemeRecord>('/api/notes/themes', payload),
    onSuccess: (_data: ThemeRecord, variables: ThemeCreateInput): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes() });
      if (variables.notebookId) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes(variables.notebookId) });
      }
    },
  });
}

export function useUpdateNoteTheme(): UseMutationResult<ThemeRecord, Error, ThemeUpdateInput & { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: ThemeUpdateInput & { id: string }) =>
      api.patch<ThemeRecord>(`/api/notes/themes/${id}`, data),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes() });
    },
  });
}

export function useDeleteNoteTheme(): UseMutationResult<DeleteResponse, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/themes/${id}`),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.themes() });
    },
  });
}
