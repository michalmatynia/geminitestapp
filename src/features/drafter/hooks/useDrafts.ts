"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductDraft } from "@/features/products/types/drafts";

export const draftKeys = {
  all: ["drafts"] as const,
  detail: (id: string) => ["drafts", id] as const,
};

export function useDrafts() {
  return useQuery({
    queryKey: draftKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/drafts");
      if (!res.ok) throw new Error("Failed to load drafts");
      return (await res.json()) as ProductDraft[];
    },
  });
}

export function useDraft(id: string) {
  return useQuery({
    queryKey: draftKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/drafts/${id}`);
      if (!res.ok) throw new Error("Failed to load draft");
      return (await res.json()) as ProductDraft;
    },
    enabled: !!id,
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/drafts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete draft");
      return id;
    },
    onSuccess: (deletedId) => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.all });
      void queryClient.removeQueries({ queryKey: draftKeys.detail(deletedId) });
    },
  });
}
