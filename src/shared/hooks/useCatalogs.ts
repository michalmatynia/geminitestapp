"use client";

import { useQuery } from "@tanstack/react-query";
import type { CatalogOption } from "@/features/data-import-export/types/imports";

export function useCatalogs() {
  return useQuery({
    queryKey: ["catalogs"],
    queryFn: async () => {
      const res = await fetch("/api/catalogs");
      if (!res.ok) throw new Error("Failed to load catalogs");
      return (await res.json()) as CatalogOption[];
    },
  });
}
