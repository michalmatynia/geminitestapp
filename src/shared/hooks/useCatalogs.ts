'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';

interface CatalogOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

export function useCatalogs(): ReturnType<typeof useQuery<CatalogOption[]>> {
  return useQuery({
    queryKey: ['catalogs'],
    queryFn: async () => await api.get<CatalogOption[]>('/api/catalogs'),
  });
}
