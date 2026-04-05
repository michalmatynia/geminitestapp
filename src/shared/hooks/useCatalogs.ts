import type { ListQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

interface CatalogOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

export function useCatalogs(): ListQuery<CatalogOption, CatalogOption[]> {
  return createListQueryV2<CatalogOption, CatalogOption[]>({
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
