'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

interface CatalogOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

export function useCatalogs(): ReturnType<typeof useQuery<CatalogOption[]>> {
  return useQuery({
    queryKey: QUERY_KEYS.products.metadata.catalogs,
    queryFn: async () => await api.get<CatalogOption[]>('/api/catalogs'),
  });
}
