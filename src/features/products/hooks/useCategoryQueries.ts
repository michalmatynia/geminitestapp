"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ProductCategoryWithChildren } from "@/features/products/types";

export function useProductCategories(catalogId?: string): UseQueryResult<ProductCategoryWithChildren[]> {
  return useQuery({
    queryKey: ["product-categories", catalogId],
    queryFn: async (): Promise<ProductCategoryWithChildren[]> => {
      if (!catalogId) return [];
      const res = await fetch(`/api/products/categories?catalogId=${catalogId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch categories");
      }
      return (await res.json()) as ProductCategoryWithChildren[];
    },
    enabled: !!catalogId,
  });
}
