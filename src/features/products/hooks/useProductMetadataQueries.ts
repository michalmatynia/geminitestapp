'use client';

import {
  useQueries,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { getLanguages } from '@/features/internationalization/api';
import type {
  CatalogRecord,
  PriceGroupWithDetails,
  Producer,
  ProductCategory,
  ProductParameter,
  ProductTag,
} from '@/features/products/types';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createMutationV2,
  createDeleteMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateProductMetadata } from '@/shared/lib/query-invalidation';
import { productMetadataKeys } from '@/shared/lib/query-key-exports';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import type { Language } from '@/shared/types/domain/internationalization';
import type { 
  ListQuery, 
  SaveMutation, 
  DeleteMutation 
} from '@/shared/types/query-result-types';

export { productMetadataKeys };

export function useCatalogs(): ListQuery<CatalogRecord> {
  const queryKey = productMetadataKeys.catalogs();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<CatalogRecord[]> => await api.get<CatalogRecord[]>('/api/catalogs'),
    meta: {
      source: 'products.hooks.useCatalogs',
      operation: 'list',
      resource: 'products.metadata.catalogs',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'catalogs'],
    },
  });
}

export function useCategories(catalogId?: string): ListQuery<ProductCategory> {
  const queryKey = productMetadataKeys.categories(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductCategory[]> => {
      if (!catalogId) return [];
      return await api.get<ProductCategory[]>(
        `/api/products/categories?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId),
    meta: {
      source: 'products.hooks.useMetadataCategories',
      operation: 'list',
      resource: 'products.metadata.categories',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'categories'],
    },
  });
}

export function useMultiCategories(catalogIds: string[]): UseQueryResult<ProductCategory[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: normalizeQueryKey(productMetadataKeys.categories(catalogId)),
      queryFn: async (): Promise<ProductCategory[]> =>
        await api.get<ProductCategory[]>(
          `/api/products/categories?catalogId=${encodeURIComponent(catalogId)}`
        ),
    })),
  });
}

export function useTags(catalogId?: string): ListQuery<ProductTag> {
  const queryKey = productMetadataKeys.tags(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductTag[]> => {
      if (!catalogId) return [];
      return await api.get<ProductTag[]>(
        `/api/products/tags?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId),
    meta: {
      source: 'products.hooks.useMetadataTags',
      operation: 'list',
      resource: 'products.metadata.tags',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'tags'],
    },
  });
}

export function useMultiTags(catalogIds: string[]): UseQueryResult<ProductTag[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: normalizeQueryKey(productMetadataKeys.tags(catalogId)),
      queryFn: async (): Promise<ProductTag[]> =>
        await api.get<ProductTag[]>(`/api/products/tags?catalogId=${encodeURIComponent(catalogId)}`),
    })),
  });
}

export function useProducers(): ListQuery<Producer> {
  const queryKey = productMetadataKeys.producers();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<Producer[]> => await api.get<Producer[]>('/api/products/producers'),
    meta: {
      source: 'products.hooks.useProducers',
      operation: 'list',
      resource: 'products.metadata.producers',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'producers'],
    },
  });
}

export function useSaveProducerMutation(): SaveMutation<Producer, { id: string | undefined; data: { name: string; website: string | null } }> {
  const queryClient = useQueryClient();
  const mutationKey = productMetadataKeys.producers();
  return createMutationV2({
    mutationFn: ({ id, data }) =>
      id
        ? api.put<Producer>(`/api/products/producers/${id}`, data)
        : api.post<Producer>('/api/products/producers', data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveProducerMutation',
      operation: 'action',
      resource: 'products.metadata.producers',
      domain: 'products',
      mutationKey,
      tags: ['products', 'metadata', 'producers', 'save'],
    },
    onSuccess: () => {
      void invalidateProductMetadata(queryClient);
    },
  });
}

export function useDeleteProducerMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  const mutationKey = productMetadataKeys.producers();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<void>(`/api/products/producers/${id}`),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteProducerMutation',
      operation: 'delete',
      resource: 'products.metadata.producers',
      domain: 'products',
      mutationKey,
      tags: ['products', 'metadata', 'producers', 'delete'],
    },
    onSuccess: () => {
      void invalidateProductMetadata(queryClient);
    },
  });
}

export function useParameters(catalogId?: string): ListQuery<ProductParameter> {
  const queryKey = productMetadataKeys.parameters(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductParameter[]> => {
      if (!catalogId) return [];
      return await api.get<ProductParameter[]>(
        `/api/products/parameters?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId),
    meta: {
      source: 'products.hooks.useParameters',
      operation: 'list',
      resource: 'products.metadata.parameters',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'parameters'],
    },
  });
}

export function useMultiParameters(catalogIds: string[]): UseQueryResult<ProductParameter[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: normalizeQueryKey(productMetadataKeys.parameters(catalogId)),
      queryFn: async (): Promise<ProductParameter[]> =>
        await api.get<ProductParameter[]>(
          `/api/products/parameters?catalogId=${encodeURIComponent(catalogId)}`
        ),
    })),
  });
}

export function useLanguages(): ListQuery<Language> {
  const queryKey = productMetadataKeys.languages();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<Language[]> => getLanguages(),
    meta: {
      source: 'products.hooks.useLanguages',
      operation: 'list',
      resource: 'products.metadata.languages',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'languages'],
    },
  });
}

export function usePriceGroups(): ListQuery<PriceGroupWithDetails> {
  const queryKey = productMetadataKeys.priceGroups();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<PriceGroupWithDetails[]> =>
      await api.get<PriceGroupWithDetails[]>('/api/price-groups'),
    meta: {
      source: 'products.hooks.usePriceGroups',
      operation: 'list',
      resource: 'products.metadata.price-groups',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'price-groups'],
    },
  });
}
