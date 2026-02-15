'use client';

import { createPostMutation, createPatchMutation, createDeleteMutation } from '@/shared/lib/api-hooks';
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


export const useCreateNote = createPostMutation<NoteWithRelations, NoteCreateInput>({
  endpoint: '/api/notes',
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useUpdateNote = createPatchMutation<NoteWithRelations, NoteUpdateInput & { id: string }>({
  endpoint: ({ id }) => `/api/notes/${id}`,
  invalidateKeys: (_data, variables) => [
    QUERY_KEYS.notes.all,
    QUERY_KEYS.notes.detail(variables.id),
  ],
});

export const useDeleteNote = createDeleteMutation<DeleteResponse, string>({
  endpoint: (id) => `/api/notes/${id}`,
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useCreateNoteFolder = createPostMutation<CategoryRecord, CategoryCreateInput>({
  endpoint: '/api/notes/categories',
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useUpdateNoteFolder = createPatchMutation<CategoryRecord, CategoryUpdateInput & { id: string }>({
  endpoint: ({ id }) => `/api/notes/categories/${id}`,
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useDeleteNoteFolder = createDeleteMutation<DeleteResponse, string>({
  endpoint: (folderId) => `/api/notes/categories/${folderId}`,
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useCreateNotebook = createPostMutation<NotebookRecord, NotebookCreateInput>({
  endpoint: '/api/notes/notebooks',
  invalidateKeys: [QUERY_KEYS.notes.notebooks()],
});

export const useUpdateNotebook = createPatchMutation<NotebookRecord, NotebookUpdateInput & { id: string }>({
  endpoint: ({ id }) => `/api/notes/notebooks/${id}`,
  invalidateKeys: (_data, variables) => [
    QUERY_KEYS.notes.notebooks(),
    QUERY_KEYS.notes.detail(variables.id),
  ],
});

export const useDeleteNotebook = createDeleteMutation<DeleteResponse, string>({
  endpoint: (id) => `/api/notes/notebooks/${id}`,
  invalidateKeys: [QUERY_KEYS.notes.all],
});

export const useCreateNoteTag = createPostMutation<TagRecord, TagCreateInput>({
  endpoint: '/api/notes/tags',
  invalidateKeys: (_data, variables) => [
    QUERY_KEYS.notes.tags(),
    QUERY_KEYS.notes.tags(variables.notebookId ?? undefined),
  ],
});

export const useUpdateNoteTag = createPatchMutation<TagRecord, TagUpdateInput & { id: string }>({
  endpoint: ({ id }) => `/api/notes/tags/${id}`,
  invalidateKeys: [QUERY_KEYS.notes.tags()],
});

export const useDeleteNoteTag = createDeleteMutation<DeleteResponse, string>({
  endpoint: (id) => `/api/notes/tags/${id}`,
  invalidateKeys: [QUERY_KEYS.notes.tags()],
});

export const useCreateNoteTheme = createPostMutation<ThemeRecord, ThemeCreateInput>({
  endpoint: '/api/notes/themes',
  invalidateKeys: (_data, variables) => [
    QUERY_KEYS.notes.themes(),
    QUERY_KEYS.notes.themes(variables.notebookId ?? undefined),
  ],
});

export const useUpdateNoteTheme = createPatchMutation<ThemeRecord, ThemeUpdateInput & { id: string }>({
  endpoint: ({ id }) => `/api/notes/themes/${id}`,
  invalidateKeys: [QUERY_KEYS.notes.themes()],
});

export const useDeleteNoteTheme = createDeleteMutation<DeleteResponse, string>({
  endpoint: (id) => `/api/notes/themes/${id}`,
  invalidateKeys: [QUERY_KEYS.notes.themes()],
});
