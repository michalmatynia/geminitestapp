'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { DeleteResponse } from '@/shared/types/api';
import type {
  NoteWithRelations,
  NoteCreateInput,
  NoteUpdateInput,
  CategoryRecord,
  CategoryUpdateInput,
  NotebookRecord,
  TagRecord,
  TagUpdateInput,
  ThemeRecord,
  ThemeUpdateInput,
} from '@/shared/types/notes';

export function useCreateNote(): UseMutationResult<NoteWithRelations, Error, NoteCreateInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NoteCreateInput) => api.post<NoteWithRelations>('/api/notes', payload),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useUpdateNote(): UseMutationResult<NoteWithRelations, Error, { id: string; data: NoteUpdateInput }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NoteUpdateInput }) => 
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

export function useCreateNoteFolder(): UseMutationResult<CategoryRecord, Error, { name: string; parentId: string | null; notebookId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; parentId: string | null; notebookId: string }) => 
      api.post<CategoryRecord>('/api/notes/categories', payload),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useUpdateNoteFolder(): UseMutationResult<CategoryRecord, Error, { id: string; data: CategoryUpdateInput }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryUpdateInput }) => 
      api.patch<CategoryRecord>(`/api/notes/categories/${id}`, data),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useDeleteNoteFolder(): UseMutationResult<DeleteResponse, Error, { folderId: string; recursive?: boolean }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId, recursive }: { folderId: string; recursive?: boolean }) => 
      api.delete<DeleteResponse>(`/api/notes/categories/${folderId}`, { params: { recursive: recursive ? 'true' : undefined } }),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.all });
    },
  });
}

export function useCreateNotebook(): UseMutationResult<NotebookRecord, Error, { name: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => api.post<NotebookRecord>('/api/notes/notebooks', { name }),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.notebooks });
    },
  });
}

export function useUpdateNotebook(): UseMutationResult<NotebookRecord, Error, { id: string; name: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => 
      api.patch<NotebookRecord>(`/api/notes/notebooks/${id}`, { name }),
    onSuccess: (_data, variables): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.notebooks });
      void queryClient.invalidateQueries({ queryKey: ['notes', variables.id] });
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

export function useCreateNoteTag(): UseMutationResult<TagRecord, Error, { name: string; notebookId: string; color?: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; notebookId: string; color?: string }) => 
      api.post<TagRecord>('/api/notes/tags', payload),
    onSuccess: (_data: TagRecord, variables: { name: string; notebookId: string; color?: string }): void => {
      void queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.notes.tags, variables.notebookId] });
    },
  });
}

export function useUpdateNoteTag(): UseMutationResult<TagRecord, Error, { id: string; data: TagUpdateInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TagUpdateInput }) => 
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

export function useCreateNoteTheme(): UseMutationResult<ThemeRecord, Error, { name: string; notebookId: string; colors: Record<string, string> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; notebookId: string; colors: Record<string, string> }) => 
      api.post<ThemeRecord>('/api/notes/themes', payload),
    onSuccess: (_data: ThemeRecord, variables: { name: string; notebookId: string; colors: Record<string, string> }): void => {
      void queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.notes.all, 'themes', variables.notebookId] });
    },
  });
}

export function useUpdateNoteTheme(): UseMutationResult<ThemeRecord, Error, { id: string; data: ThemeUpdateInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ThemeUpdateInput }) => 
      api.patch<ThemeRecord>(`/api/notes/themes/${id}`, data),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.notes.all, 'themes'] });
    },
  });
}

export function useDeleteNoteTheme(): UseMutationResult<DeleteResponse, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/themes/${id}`),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.notes.all, 'themes'] });
    },
  });
}