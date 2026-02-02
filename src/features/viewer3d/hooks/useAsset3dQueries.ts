"use client";

import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { fetchAssets3D, fetchCategories, fetchTags, reindexAssets3DFromDisk } from "@/features/viewer3d/api";
import type { Asset3DListFilters, Asset3DRecord } from "@/features/viewer3d/types";

export const asset3dKeys = {
  all: ["assets3d"] as const,
  list: (filters: Asset3DListFilters) => ["assets3d", "list", filters] as const,
  categories: ["assets3d", "categories"] as const,
  tags: ["assets3d", "tags"] as const,
  detail: (id: string | null) => ["assets3d", "detail", id] as const,
};

export function useAssets3D(filters: Asset3DListFilters): UseQueryResult<Asset3DRecord[], Error> {
  return useQuery({
    queryKey: asset3dKeys.list(filters),
    queryFn: () => fetchAssets3D(filters),
  });
}

export function useAsset3DCategories(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: asset3dKeys.categories,
    queryFn: fetchCategories,
  });
}

export function useAsset3DTags(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: asset3dKeys.tags,
    queryFn: fetchTags,
  });
}

export function useAsset3DById(id: string | null): UseQueryResult<Asset3DRecord, Error> {
  return useQuery<Asset3DRecord>({
    queryKey: asset3dKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/assets3d/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch 3D asset");
      }
      return (await res.json()) as Asset3DRecord;
    },
    enabled: Boolean(id),
  });
}

export function useDeleteAsset3DMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/assets3d/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete 3D asset");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: asset3dKeys.all });
    },
  });
}

export function useUpdateAsset3DMutation(): UseMutationResult<Asset3DRecord, Error, { id: string; data: Partial<Asset3DRecord> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Asset3DRecord> }): Promise<Asset3DRecord> => {
      const res = await fetch(`/api/assets3d/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update 3D asset");
      return res.json() as Promise<Asset3DRecord>;
    },
    onSuccess: (data: Asset3DRecord) => {
      void queryClient.invalidateQueries({ queryKey: asset3dKeys.all });
      void queryClient.invalidateQueries({ queryKey: asset3dKeys.detail(data.id) });
    },
  });
}

export function useReindexAssets3DMutation(): UseMutationResult<
  {
    diskFiles: number;
    supportedFiles: number;
    existingRecords: number;
    created: number;
    skipped: number;
    createdIds: string[];
  },
  Error,
  void
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => reindexAssets3DFromDisk(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: asset3dKeys.all });
    },
  });
}
