import type {
  ProductTitleTerm,
  ProductTitleTermType,
} from '@/shared/contracts/products/title-terms';
import type { DeleteMutation, ListQuery, SaveMutation } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createDeleteMutationV2, createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import {
  invalidateProductMetadata,
  invalidateProductTitleTerms,
} from '@/shared/lib/query-invalidation';

import {
  hasMutationId,
  normalizeOptionalIdentifier,
  productMetadataKeys,
  resolveMetadataQueryEnabled,
  STABLE_METADATA_QUERY_OPTIONS,
  type ProductMetadataQueryOptions,
} from './useProductMetadataQueries.shared';

type TitleTermRequestParams = {
  catalogId?: string;
  type?: ProductTitleTermType;
};

const buildTitleTermRequestParams = (
  catalogId: string | null,
  type: ProductTitleTermType | null
): TitleTermRequestParams => ({
  ...(catalogId !== null ? { catalogId } : {}),
  ...(type !== null ? { type } : {}),
});

const resolveTitleTermsEnabled = (
  catalogId: string | null,
  allowWithoutCatalog: boolean,
  options?: ProductMetadataQueryOptions
): boolean =>
  (allowWithoutCatalog || catalogId !== null) && resolveMetadataQueryEnabled(options);

export function useTitleTerms(
  catalogId?: string,
  type?: ProductTitleTermType | null,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductTitleTerm> {
  const allowWithoutCatalog = options?.allowWithoutCatalog ?? false;
  const resolvedCatalogId = normalizeOptionalIdentifier(catalogId);
  const resolvedType = type ?? null;
  const queryKey = productMetadataKeys.titleTerms(resolvedCatalogId, resolvedType);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductTitleTerm[]> => {
      if (resolvedCatalogId === null && !allowWithoutCatalog) return [];
      return await api.get<ProductTitleTerm[]>('/api/v2/products/title-terms', {
        params: buildTitleTermRequestParams(resolvedCatalogId, resolvedType),
        cache: 'no-store',
      });
    },
    enabled: resolveTitleTermsEnabled(resolvedCatalogId, allowWithoutCatalog, options),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useTitleTerms',
      operation: 'list',
      resource: 'products.metadata.title-terms',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'title-terms'],
      description: 'Loads products metadata title terms.',
    },
  });
}

export function useSaveTitleTermMutation(): SaveMutation<
  ProductTitleTerm,
  {
    id?: string;
    data: {
      catalogId: string;
      type: ProductTitleTermType;
      name_en: string;
      name_pl?: string | null;
    };
  }
> {
  const mutationKey = [...productMetadataKeys.all, 'title-terms', 'save'] as const;
  return createMutationV2({
    mutationFn: ({ id, data }) =>
      hasMutationId(id)
        ? api.put<ProductTitleTerm>(`/api/v2/products/title-terms/${id}`, data)
        : api.post<ProductTitleTerm>('/api/v2/products/title-terms', data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveTitleTermMutation',
      operation: 'action',
      resource: 'products.metadata.title-terms',
      domain: 'products',
      mutationKey,
      tags: ['products', 'metadata', 'title-terms', 'save'],
      description: 'Runs products metadata title terms.',
    },
    invalidate: async (queryClient): Promise<void> => {
      await Promise.all([
        invalidateProductTitleTerms(queryClient),
        invalidateProductMetadata(queryClient),
      ]);
    },
  });
}

export function useDeleteTitleTermMutation(): DeleteMutation<
  void,
  { id: string; catalogId?: string | null }
> {
  const mutationKey = [...productMetadataKeys.all, 'title-terms', 'delete'] as const;
  return createDeleteMutationV2({
    mutationFn: async ({ id }): Promise<void> => {
      await api.delete<void>(`/api/v2/products/title-terms/${id}`);
    },
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteTitleTermMutation',
      operation: 'delete',
      resource: 'products.metadata.title-terms',
      domain: 'products',
      mutationKey,
      tags: ['products', 'metadata', 'title-terms', 'delete'],
      description: 'Deletes products metadata title terms.',
    },
    invalidate: async (queryClient, _data, variables): Promise<void> => {
      await Promise.all([
        invalidateProductTitleTerms(queryClient, variables.catalogId ?? null),
        invalidateProductMetadata(queryClient),
      ]);
    },
  });
}
