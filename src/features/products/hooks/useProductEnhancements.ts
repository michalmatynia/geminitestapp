/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/typedef */
"use client";

import { useOptimisticMutation } from "@/shared/hooks/useOptimisticMutation";
// import { useCacheWarmup, useSmartPrefetch } from "@/shared/hooks/useCacheWarmup";
import { useQuerySync } from "@/shared/hooks/useQuerySync";
import type { ProductWithImages } from "@/features/products/types";

import type { UseMutationResult } from "@tanstack/react-query";

// Enhanced product mutations with optimistic updates
export function useOptimisticProductUpdate(): UseMutationResult<
  ProductWithImages,
  Error,
  { id: string; data: Partial<ProductWithImages> },
  { previousData: ProductWithImages[] | undefined }
> {
  return useOptimisticMutation<
    ProductWithImages,
    Error,
    { id: string; data: Partial<ProductWithImages> },
    ProductWithImages[]
  >(
    async ({ id, data }): Promise<ProductWithImages> => {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update product");
      const result = await res.json();
      return result as ProductWithImages;
    },
    {
      queryKey: ["products"],
      updateFn: (oldData: ProductWithImages[] | undefined, { id, data }: { id: string; data: Partial<ProductWithImages> }) => {
        if (!oldData) return [];
        return oldData.map((product: ProductWithImages) =>
          product.id === id ? ({ ...product, ...data } as ProductWithImages) : product
        );
      },
      revertOnError: true,
    }
  );
}

// Hook for warming up product-related caches
export function useProductCacheWarmup(productId?: string): void {
  const resolveWarmCatalogId = async (): Promise<string | null> => {
    try {
      const catalogsRes = await fetch("/api/catalogs");
      if (!catalogsRes.ok) return null;
      const catalogs = (await catalogsRes.json()) as Array<{ id?: string }>;
      if (!Array.isArray(catalogs) || catalogs.length === 0) return null;
      return catalogs[0]?.id ?? null;
    } catch {
      return null;
    }
  };

  useCacheWarmup([
    {
      queryKey: ["products"],
      queryFn: async (): Promise<unknown> => {
        const res = await fetch("/api/products");
        const result = await res.json();
        return result;
      },
      priority: "high" as const,
    },
    {
      queryKey: ["products", "categories"],
      queryFn: async (): Promise<unknown> => {
        const catalogId = await resolveWarmCatalogId();
        if (!catalogId) return [];
        const res = await fetch(
          `/api/products/categories?catalogId=${encodeURIComponent(catalogId)}`
        );
        if (!res.ok) return [];
        return res.json();
      },
      priority: "medium" as const,
    },
    ...(productId ? [{
      queryKey: ["products", productId],
      queryFn: async (): Promise<unknown> => {
        const res = await fetch(`/api/products/${productId}`);
        const result = await res.json();
        return result;
      },
      priority: "high" as const,
      conditions: (): boolean => !!productId,
    }] : []),
  ]);
}

// Hook for smart product prefetching
export function useProductPrefetch(): {
  prefetchProduct: (productId: string) => { onMouseEnter: () => void; onMouseLeave: () => void };
  prefetchProductEdit: (productId: string) => { onFocus: () => void };
} {
  const { prefetchOnHover, prefetchOnFocus } = useSmartPrefetch();

  const prefetchProduct = (productId: string): { onMouseEnter: () => void; onMouseLeave: () => void } =>
    prefetchOnHover(
      ["products", productId],
      async (): Promise<unknown> => {
        const res = await fetch(`/api/products/${productId}`);
        return res.json();
      }
    );

  const prefetchProductEdit = (productId: string): { onFocus: () => void } =>
    prefetchOnFocus(
      ["products", productId, "edit"],
      async (): Promise<unknown> => {
        const res = await fetch(`/api/products/${productId}`);
        return res.json();
      }
    );

  return { prefetchProduct, prefetchProductEdit };
}

// Hook for syncing product data across tabs
export function useProductSync(): void {
  useQuerySync([
    {
      queryKey: ["products"],
      enabled: true,
    },
    {
      queryKey: ["products", "categories"],
      enabled: true,
    },
  ]);
}
