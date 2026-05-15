/**
 * Catalogs Query Hook
 * 
 * TanStack Query hook for product catalog metadata.
 * Provides:
 * - Catalog options query with caching
 * - Default catalog identification
 * - Catalog metadata retrieval
 * - Observability integration for catalog queries
 */

import type { ListQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

/** Catalog option type with metadata */
interface CatalogOption {
  /** Unique catalog identifier */
  id: string;
  /** Catalog display name */
  name: string;
  /** Whether this is the default catalog */
  isDefault?: boolean;
}

/**
 * Hook for querying available product catalogs
 * @returns Query result with catalog options
 */
export function useCatalogs(): ListQuery<CatalogOption, CatalogOption[]> {
  return useListQueryV2<CatalogOption, CatalogOption[]>({
    queryKey: QUERY_KEYS.products.metadata.catalogs(),
    queryFn: async () => await api.get<CatalogOption[]>('/api/v2/products/entities/catalogs'),
    staleTime: 0,
    meta: {
      source: 'shared.hooks.useCatalogs',
      operation: 'list',
      resource: 'catalogs',
      domain: 'products',
      tags: ['products', 'catalogs'],
      description: 'Loads catalogs.'},
  });
}
