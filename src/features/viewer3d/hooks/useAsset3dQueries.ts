"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAssets3D, fetchCategories, fetchTags } from "@/features/viewer3d/api";
import type { Asset3DListFilters, Asset3DRecord } from "@/features/viewer3d/types";

export function useAssets3D(filters: Asset3DListFilters): UseQueryResult<Asset3DRecord[], Error> {
  return useQuery({
    queryKey: ["assets3d", filters],
    queryFn: () => fetchAssets3D(filters),
  });
}

export function useAsset3DCategories(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: ["assets3d", "categories"],
    queryFn: fetchCategories,
  });
}

export function useAsset3DTags(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: ["assets3d", "tags"],
    queryFn: fetchTags,
  });
}

export function useAsset3DById(id: string | null): UseQueryResult<Asset3DRecord, Error> {
  return useQuery<Asset3DRecord>({
    queryKey: ["assets3d", "detail", id],
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
