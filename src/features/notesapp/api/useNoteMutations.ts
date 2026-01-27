"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NoteWithRelations } from "@/shared/types/notes";

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to create note");
      return (await response.json()) as NoteWithRelations;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update note");
      return (await response.json()) as NoteWithRelations;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
      // Also invalidate specific note if needed, but the list should be enough for most cases
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete note");
      return (await response.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
    },
  });
}

export function useCreateNoteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; parentId: string | null; notebookId: string }) => {
      const response = await fetch("/api/notes/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to create folder");
      return (await response.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
    },
  });
}

export function useUpdateNoteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/notes/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update folder");
      return (await response.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteNoteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, recursive }: { folderId: string; recursive?: boolean }) => {
      const url = `/api/notes/categories/${folderId}${recursive ? "?recursive=true" : ""}`;
      const response = await fetch(url, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete folder");
      return (await response.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}
