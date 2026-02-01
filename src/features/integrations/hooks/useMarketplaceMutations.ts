"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

export function useFetchExternalCategoriesMutation(): UseMutationResult<
  { fetched: number; message: string },
  Error,
  { connectionId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId }) => {
      const res = await fetch("/api/marketplace/categories/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to fetch categories");
      }

      return (await res.json()) as { fetched: number; message: string };
    },
    onSuccess: (_, { connectionId }) => {
      void queryClient.invalidateQueries({ queryKey: ["marketplace-categories", connectionId] });
    },
  });
}

export function useSaveMappingsMutation(): UseMutationResult<
  { upserted: number; message: string },
  Error,
  { connectionId: string; catalogId: string; mappings: { externalCategoryId: string; internalCategoryId: string }[] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, catalogId, mappings }) => {
      const res = await fetch("/api/marketplace/mappings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          catalogId,
          mappings,
        }),
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to save mappings");
      }

      return (await res.json()) as { upserted: number; message: string };
    },
    onSuccess: (_, { connectionId, catalogId }) => {
      void queryClient.invalidateQueries({ queryKey: ["category-mappings", connectionId, catalogId] });
    },
  });
}
