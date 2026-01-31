"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

export function useCreateNote(): UseMutationResult<NoteWithRelations, Error, NoteCreateInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: NoteCreateInput): Promise<NoteWithRelations> => {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to create note");
      return (await response.json()) as NoteWithRelations;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
    },
  });
}

export function useUpdateNote(): UseMutationResult<NoteWithRelations, Error, { id: string; data: NoteUpdateInput }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: NoteUpdateInput }): Promise<NoteWithRelations> => {
      const response = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update note");
      return (await response.json()) as NoteWithRelations;
    },
    onSuccess: (_data: NoteWithRelations): void => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
      // Also invalidate specific note if needed, but the list should be enough for most cases
    },
  });
}

export function useDeleteNote(): UseMutationResult<DeleteResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete note");
      return (await response.json()) as DeleteResponse;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
    },
  });
}

export function useCreateNoteFolder(): UseMutationResult<CategoryRecord, Error, { name: string; parentId: string | null; notebookId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; parentId: string | null; notebookId: string }): Promise<CategoryRecord> => {
      const response = await fetch("/api/notes/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to create folder");
      return (await response.json()) as CategoryRecord;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
    },
  });
}

export function useUpdateNoteFolder(): UseMutationResult<CategoryRecord, Error, { id: string; data: CategoryUpdateInput }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryUpdateInput }): Promise<CategoryRecord> => {
      const response = await fetch(`/api/notes/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update folder");
      return (await response.json()) as CategoryRecord;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteNoteFolder(): UseMutationResult<DeleteResponse, Error, { folderId: string; recursive?: boolean }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, recursive }: { folderId: string; recursive?: boolean }): Promise<DeleteResponse> => {
      const url = `/api/notes/categories/${folderId}${recursive ? "?recursive=true" : ""}`;
      const response = await fetch(url, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete folder");
      return (await response.json()) as DeleteResponse;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useCreateNotebook(): UseMutationResult<NotebookRecord, Error, { name: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: { name: string }): Promise<NotebookRecord> => {
      const response = await fetch("/api/notes/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to create notebook");
      return (await response.json()) as NotebookRecord;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useUpdateNotebook(): UseMutationResult<NotebookRecord, Error, { id: string; name: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }): Promise<NotebookRecord> => {
      const response = await fetch(`/api/notes/notebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to update notebook");
      return (await response.json()) as NotebookRecord;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useDeleteNotebook(): UseMutationResult<DeleteResponse, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/notes/notebooks/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete notebook");
      return (await response.json()) as DeleteResponse;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["note-tags"] });
      void queryClient.invalidateQueries({ queryKey: ["note-themes"] });
    },
  });
}

export function useCreateNoteTag(): UseMutationResult<TagRecord, Error, { name: string; notebookId: string; color?: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; notebookId: string; color?: string }): Promise<TagRecord> => {
      const response = await fetch("/api/notes/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to create tag");
      return (await response.json()) as TagRecord;
    },
    onSuccess: (_data: TagRecord, variables: { notebookId: string }): void => {
      void queryClient.invalidateQueries({ queryKey: ["note-tags", variables.notebookId] });
    },
  });
}

export function useUpdateNoteTag(): UseMutationResult<TagRecord, Error, { id: string; data: TagUpdateInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TagUpdateInput }): Promise<TagRecord> => {
      const response = await fetch(`/api/notes/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update tag");
      return (await response.json()) as TagRecord;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["note-tags"] });
    },
  });
}

export function useDeleteNoteTag(): UseMutationResult<DeleteResponse, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/notes/tags/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete tag");
      return (await response.json()) as DeleteResponse;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["note-tags"] });
    },
  });
}

export function useCreateNoteTheme(): UseMutationResult<ThemeRecord, Error, { name: string; notebookId: string; colors: Record<string, string> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; notebookId: string; colors: Record<string, string> }): Promise<ThemeRecord> => {
      const response = await fetch("/api/notes/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to create theme");
      return (await response.json()) as ThemeRecord;
    },
    onSuccess: (_data: ThemeRecord, variables: { notebookId: string }): void => {
      void queryClient.invalidateQueries({ queryKey: ["note-themes", variables.notebookId] });
    },
  });
}

export function useUpdateNoteTheme(): UseMutationResult<ThemeRecord, Error, { id: string; data: ThemeUpdateInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ThemeUpdateInput }): Promise<ThemeRecord> => {
      const response = await fetch(`/api/notes/themes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update theme");
      return (await response.json()) as ThemeRecord;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["note-themes"] });
    },
  });
}

export function useDeleteNoteTheme(): UseMutationResult<DeleteResponse, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/notes/themes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete theme");
      return (await response.json()) as DeleteResponse;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["note-themes"] });
    },
  });
}
