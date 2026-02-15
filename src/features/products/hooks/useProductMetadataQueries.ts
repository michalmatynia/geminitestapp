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
  createListQuery,
  createSaveMutation,
  createDeleteMutation,
} from '@/shared/lib/query-factories';
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
  return createListQuery({
    queryKey: productMetadataKeys.catalogs(),
    queryFn: async (): Promise<CatalogRecord[]> => await api.get<CatalogRecord[]>('/api/catalogs'),
  });
}

export function useCategories(catalogId?: string): ListQuery<ProductCategory> {
  return createListQuery({
    queryKey: productMetadataKeys.categories(catalogId ?? null),
    queryFn: async (): Promise<ProductCategory[]> => {
      if (!catalogId) return [];
      return await api.get<ProductCategory[]>(
        `/api/products/categories?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    options: {
      enabled: Boolean(catalogId),
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
  return createListQuery({
    queryKey: productMetadataKeys.tags(catalogId ?? null),
    queryFn: async (): Promise<ProductTag[]> => {
      if (!catalogId) return [];
      return await api.get<ProductTag[]>(
        `/api/products/tags?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    options: {
      enabled: Boolean(catalogId),
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
  return createListQuery({
    queryKey: productMetadataKeys.producers(),
    queryFn: async (): Promise<Producer[]> => await api.get<Producer[]>('/api/products/producers'),
  });
}

export function useSaveProducerMutation(): SaveMutation<Producer, { id: string | undefined; data: { name: string; website: string | null } }> {
  const queryClient = useQueryClient();
  return createSaveMutation({
    mutationFn: ({ id, data }) =>
      id
        ? api.put<Producer>(`/api/products/producers/${id}`, data)
        : api.post<Producer>('/api/products/producers', data),
    options: {
      onSuccess: () => {
        void invalidateProductMetadata(queryClient);
      },
    },
  });
}

export function useDeleteProducerMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/products/producers/${id}`),
    options: {
      onSuccess: () => {
        void invalidateProductMetadata(queryClient);
      },
    },
  });
}

export function useParameters(catalogId?: string): ListQuery<ProductParameter> {
  return createListQuery({
    queryKey: productMetadataKeys.parameters(catalogId ?? null),
    queryFn: async (): Promise<ProductParameter[]> => {
      if (!catalogId) return [];
      return await api.get<ProductParameter[]>(
        `/api/products/parameters?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    options: {
      enabled: Boolean(catalogId),
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
  return createListQuery({
    queryKey: productMetadataKeys.languages(),
    queryFn: async (): Promise<Language[]> => getLanguages(),
  });
}

export function usePriceGroups(): ListQuery<PriceGroupWithDetails> {
  return createListQuery({
    queryKey: productMetadataKeys.priceGroups(),
    queryFn: async (): Promise<PriceGroupWithDetails[]> =>
      await api.get<PriceGroupWithDetails[]>('/api/price-groups'),
  });
}
