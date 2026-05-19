import type {
  ProductTitleTerm,
  ProductTitleTermType,
} from '@/shared/contracts/products/title-terms';
import type { DeleteMutation, ListQuery, SaveMutation } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useDeleteMutationV2, useListQueryV2, useMutationV2 } from '@/shared/lib/query-factories-v2';
import {
  invalidateProductMetadata,
  invalidateProductTitleTerms,
} from '@/shared/lib/query-invalidation';

import {
  hasMutationId,
  productMetadataKeys,
  resolveMetadataQueryEnabled,
  STABLE_METADATA_QUERY_OPTIONS,
  type ProductMetadataQueryOptions,
} from './useProductMetadataQueries.shared';

type TitleTermRequestParams = {
  type?: ProductTitleTermType;
};

const buildTitleTermRequestParams = (type: ProductTitleTermType | null): TitleTermRequestParams => ({
  ...(type !== null ? { type } : {}),
});

const resolveTitleTermsEnabled = (options?: ProductMetadataQueryOptions): boolean =>
  resolveMetadataQueryEnabled(options);

export function useTitleTerms(
  _catalogId?: string,
  type?: ProductTitleTermType | null,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductTitleTerm> {
  const resolvedType = type ?? null;
  const queryKey = productMetadataKeys.titleTerms(null, resolvedType);
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductTitleTerm[]> => {
      return await api.get<ProductTitleTerm[]>('/api/v2/products/title-terms', {
        params: buildTitleTermRequestParams(resolvedType),
        cache: 'no-store',
      });
    },
    enabled: resolveTitleTermsEnabled(options),
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
      type: ProductTitleTermType;
      name_en: string;
      name_pl?: string | null;
    };
  }
> {
  const mutationKey = [...productMetadataKeys.all, 'title-terms', 'save'] as const;
  return useMutationV2({
    mutationFn: ({ id, data }) => {
      const payload = {
        type: data.type,
        name_en: data.name_en,
        name_pl: data.name_pl,
      };
      return hasMutationId(id)
        ? api.put<ProductTitleTerm>(`/api/v2/products/title-terms/${id}`, payload)
        : api.post<ProductTitleTerm>('/api/v2/products/title-terms', payload);
    },
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

export function useDeleteTitleTermMutation(): DeleteMutation<void, { id: string }> {
  const mutationKey = [...productMetadataKeys.all, 'title-terms', 'delete'] as const;
  return useDeleteMutationV2({
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
    invalidate: async (queryClient): Promise<void> => {
      await Promise.all([
        invalidateProductTitleTerms(queryClient),
        invalidateProductMetadata(queryClient),
      ]);
    },
  });
}
