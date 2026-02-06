'use client';

import { useQuery } from '@tanstack/react-query';

interface CatalogOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

export function useCatalogs(): ReturnType<typeof useQuery<CatalogOption[]>> {
  return useQuery({
    queryKey: ['catalogs'],
    queryFn: async () => {
      const res = await fetch('/api/catalogs');
      if (!res.ok) throw new Error('Failed to load catalogs');
      return (await res.json()) as CatalogOption[];
    },
  });
}
