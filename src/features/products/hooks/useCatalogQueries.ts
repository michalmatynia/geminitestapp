"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Catalog } from "@/features/products/types";

export function useCatalogs(): UseQueryResult<Catalog[]> {
  return useQuery({
    queryKey: ["catalogs"],
    queryFn: async (): Promise<Catalog[]> => {
      const res = await fetch("/api/catalogs");
      if (!res.ok) {
        throw new Error("Failed to fetch catalogs");
      }
      return (await res.json()) as Catalog[];
    },
  });
}
