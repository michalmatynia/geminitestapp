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

export function useCreateNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const response = await fetch("/api/notes/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to create notebook");
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useUpdateNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await fetch(`/api/notes/notebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to update notebook");
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useDeleteNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notes/notebooks/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete notebook");
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      void queryClient.invalidateQueries({ queryKey: ["note-folder-tree"] });
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["note-tags"] });
      void queryClient.invalidateQueries({ queryKey: ["note-themes"] });
    },
  });
}

export function useCreateNoteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; notebookId: string; color?: string }) => {
      const response = await fetch("/api/notes/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to create tag");
      return response.json();
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["note-tags", variables.notebookId] });
    },
  });
}

export function useUpdateNoteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await fetch(`/api/notes/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update tag");
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["note-tags"] });
    },
  });
}

export function useDeleteNoteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notes/tags/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete tag");
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["note-tags"] });
    },
  });
}

export function useCreateNoteTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; notebookId: string; colors: Record<string, string> }) => {
      const response = await fetch("/api/notes/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to create theme");
      return response.json();
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["note-themes", variables.notebookId] });
    },
  });
}

export function useUpdateNoteTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await fetch(`/api/notes/themes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update theme");
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["note-themes"] });
    },
  });
}

export function useDeleteNoteTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notes/themes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete theme");
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["note-themes"] });
    },
  });
}
