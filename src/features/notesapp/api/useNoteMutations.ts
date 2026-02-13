'use client';

import { api } from '@/shared/lib/api-client';
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

import { createMutationHook } from '@/shared/lib/api-hooks';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export const useCreateNote = createMutationHook({
  mutationFn: (payload: NoteCreateInput) => api.post<NoteWithRelations>('/api/notes', payload),
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useUpdateNote = createMutationHook({
  mutationFn: ({ id, ...data }: NoteUpdateInput & { id: string }) =>
    api.patch<NoteWithRelations>(`/api/notes/${id}`, data),
  invalidateKeys: (_data, variables) => [
    QUERY_KEYS.notes.all,
    QUERY_KEYS.notes.detail(variables.id),
  ],
});

export const useDeleteNote = createMutationHook({
  mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/${id}`),
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useCreateNoteFolder = createMutationHook({
  mutationFn: (payload: CategoryCreateInput) =>
    api.post<CategoryRecord>('/api/notes/categories', payload),
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useUpdateNoteFolder = createMutationHook({
  mutationFn: ({ id, ...data }: CategoryUpdateInput & { id: string }) =>
    api.patch<CategoryRecord>(`/api/notes/categories/${id}`, data),
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useDeleteNoteFolder = createMutationHook({
  mutationFn: (folderId: string) =>
    api.delete<DeleteResponse>(`/api/notes/categories/${folderId}`),
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useCreateNotebook = createMutationHook({
  mutationFn: (payload: NotebookCreateInput) => api.post<NotebookRecord>('/api/notes/notebooks', payload),
  invalidateKeys: [QUERY_KEYS.notes.notebooks],
});

export const useUpdateNotebook = createMutationHook({
  mutationFn: ({ id, ...data }: NotebookUpdateInput & { id: string }) =>
    api.patch<NotebookRecord>(`/api/notes/notebooks/${id}`, data),
  invalidateKeys: (_data, variables) => [
    QUERY_KEYS.notes.notebooks,
    QUERY_KEYS.notes.detail(variables.id),
  ],
});

export const useDeleteNotebook = createMutationHook({
  mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/notebooks/${id}`),
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useCreateNoteTag = createMutationHook({
  mutationFn: (payload: TagCreateInput) =>
    api.post<TagRecord>('/api/notes/tags', payload),
  invalidateKeys: (_data, variables) => [
    QUERY_KEYS.notes.tags(),
    QUERY_KEYS.notes.tags(variables.notebookId ?? undefined),
  ],
});

export const useUpdateNoteTag = createMutationHook({
  mutationFn: ({ id, ...data }: TagUpdateInput & { id: string }) =>
    api.patch<TagRecord>(`/api/notes/tags/${id}`, data),
  invalidateKeys: [QUERY_KEYS.notes.tags()],
});

export const useDeleteNoteTag = createMutationHook({
  mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/tags/${id}`),
  invalidateKeys: [QUERY_KEYS.notes.tags()],
});

export const useCreateNoteTheme = createMutationHook({
  mutationFn: (payload: ThemeCreateInput) =>
    api.post<ThemeRecord>('/api/notes/themes', payload),
  invalidateKeys: (_data, variables) => [
    QUERY_KEYS.notes.themes(),
    QUERY_KEYS.notes.themes(variables.notebookId ?? undefined),
  ],
});

export const useUpdateNoteTheme = createMutationHook({
  mutationFn: ({ id, ...data }: ThemeUpdateInput & { id: string }) =>
    api.patch<ThemeRecord>(`/api/notes/themes/${id}`, data),
  invalidateKeys: [QUERY_KEYS.notes.themes()],
});

export const useDeleteNoteTheme = createMutationHook({
  mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/themes/${id}`),
  invalidateKeys: [QUERY_KEYS.notes.themes()],
});
