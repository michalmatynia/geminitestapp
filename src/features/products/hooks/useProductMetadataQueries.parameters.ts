import { getLanguages } from '@/features/internationalization/public';
import type { Language } from '@/shared/contracts/internationalization';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductParameter, ProductSimpleParameter } from '@/shared/contracts/products/parameters';
import type { PriceGroupWithDetails } from '@/shared/contracts/products/product';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useListQueryV2 } from '@/shared/lib/query-factories-v2';

import {
  normalizeOptionalIdentifier,
  productMetadataKeys,
  resolveMetadataQueryEnabled,
  STABLE_METADATA_QUERY_OPTIONS,
  type ProductMetadataQueryOptions,
} from './useProductMetadataQueries.shared';

export function useParameters(
  catalogId?: string,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductParameter> {
  const allowWithoutCatalog = options?.allowWithoutCatalog ?? false;
  const resolvedCatalogId = normalizeOptionalIdentifier(catalogId);
  const queryKey = productMetadataKeys.parameters(resolvedCatalogId);
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductParameter[]> => {
      if (resolvedCatalogId === null && !allowWithoutCatalog) return [];
      return await api.get<ProductParameter[]>('/api/v2/products/parameters', {
        params: resolvedCatalogId !== null ? { catalogId: resolvedCatalogId } : {},
        cache: 'no-store',
      });
    },
    enabled:
      (resolvedCatalogId !== null || allowWithoutCatalog) &&
      resolveMetadataQueryEnabled(options),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useParameters',
      operation: 'list',
      resource: 'products.metadata.parameters',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'parameters'],
      description: 'Loads products metadata parameters.',
    },
  });
}

export function useCustomFields(
  options?: ProductMetadataQueryOptions
): ListQuery<ProductCustomFieldDefinition> {
  const queryKey = productMetadataKeys.customFields();
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductCustomFieldDefinition[]> =>
      await api.get<ProductCustomFieldDefinition[]>('/api/v2/products/custom-fields', {
        cache: 'no-store',
      }),
    enabled: resolveMetadataQueryEnabled(options),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useCustomFields',
      operation: 'list',
      resource: 'products.metadata.custom-fields',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'custom-fields'],
      description: 'Loads products metadata custom fields.',
    },
  });
}

export function useSimpleParameters(
  catalogId?: string,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductSimpleParameter> {
  const allowWithoutCatalog = options?.allowWithoutCatalog ?? false;
  const normalizedCatalogId = catalogId?.trim() ?? '';
  const queryCatalogId = normalizedCatalogId.length > 0 ? normalizedCatalogId : null;
  const queryKey = productMetadataKeys.simpleParameters(queryCatalogId);
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductSimpleParameter[]> => {
      if (queryCatalogId === null && !allowWithoutCatalog) return [];
      return await api.get<ProductSimpleParameter[]>('/api/v2/products/simple-parameters', {
        params: queryCatalogId !== null ? { catalogId: normalizedCatalogId } : {},
        cache: 'no-store',
      });
    },
    enabled:
      (queryCatalogId !== null || allowWithoutCatalog) &&
      resolveMetadataQueryEnabled(options),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useSimpleParameters',
      operation: 'list',
      resource: 'products.metadata.simple-parameters',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'simple-parameters'],
      description: 'Loads products metadata simple parameters.',
    },
  });
}

export function useLanguages(): ListQuery<Language> {
  const queryKey = productMetadataKeys.languages();
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<Language[]> => getLanguages(),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useLanguages',
      operation: 'list',
      resource: 'products.metadata.languages',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'languages'],
      description: 'Loads products metadata languages.',
    },
  });
}

export function usePriceGroups(
  options?: ProductMetadataQueryOptions
): ListQuery<PriceGroupWithDetails> {
  const queryKey = productMetadataKeys.priceGroups();
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<PriceGroupWithDetails[]> =>
      await api.get<PriceGroupWithDetails[]>('/api/v2/products/metadata/price-groups'),
    enabled: resolveMetadataQueryEnabled(options),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.usePriceGroups',
      operation: 'list',
      resource: 'products.metadata.price-groups',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'price-groups'],
      description: 'Loads products metadata price groups.',
    },
  });
}
