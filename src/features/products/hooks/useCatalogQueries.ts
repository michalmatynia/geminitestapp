'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { Catalog } from '@/features/products/types';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useCatalogs(): UseQueryResult<Catalog[]> {
  return useQuery({
    queryKey: QUERY_KEYS.products.catalogs,
    queryFn: async (): Promise<Catalog[]> => await api.get<Catalog[]>('/api/catalogs'),
  });
}
