'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { createMultiQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { getCategoriesFlat, getParameters, getTags } from '@/features/products/forms.public';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductTag } from '@/shared/contracts/products/tags';
import type { ProductParameter } from '@/shared/contracts/products/parameters';

const readQueryData = <T,>(queries: readonly UseQueryResult<T[], Error>[]): T[] =>
  queries.flatMap((query: UseQueryResult<T[], Error>): T[] => query.data ?? []);

const hasLoadingQuery = <T,>(queries: readonly UseQueryResult<T[], Error>[]): boolean =>
  queries.some((query: UseQueryResult<T[], Error>): boolean => query.isLoading);

export const useDraftMetadata = (selectedCatalogIds: string[]) => {
  const categoryQueries = createMultiQueryV2({
    queries: selectedCatalogIds.map((id: string) => {
      const queryKey = normalizeQueryKey(QUERY_KEYS.products.metadata.categories(id));
      return {
        queryKey,
        queryFn: () => getCategoriesFlat(id),
        meta: {
          source: 'drafter.hooks.useDraftMetadata.categories',
          operation: 'list',
          resource: 'products.metadata.categories',
          description: 'Loads products metadata categories.',
          domain: 'products',
          queryKey,
          tags: ['products', 'metadata', 'categories', 'multi'],
        },
      };
    }),
  }) as readonly UseQueryResult<ProductCategory[], Error>[];

  const tagQueries = createMultiQueryV2({
    queries: selectedCatalogIds.map((id: string) => {
      const queryKey = normalizeQueryKey(QUERY_KEYS.products.metadata.tags(id));
      return {
        queryKey,
        queryFn: () => getTags(id),
        meta: {
          source: 'drafter.hooks.useDraftMetadata.tags',
          operation: 'list',
          resource: 'products.metadata.tags',
          description: 'Loads products metadata tags.',
          domain: 'products',
          queryKey,
          tags: ['products', 'metadata', 'tags', 'multi'],
        },
      };
    }),
  }) as readonly UseQueryResult<ProductTag[], Error>[];

  const parameterQueries = createMultiQueryV2({
    queries: selectedCatalogIds.map((id: string) => {
      const queryKey = normalizeQueryKey(QUERY_KEYS.products.metadata.parameters(id));
      return {
        queryKey,
        queryFn: () => getParameters(id),
        meta: {
          source: 'drafter.hooks.useDraftMetadata.parameters',
          operation: 'list',
          resource: 'products.metadata.parameters',
          description: 'Loads products metadata parameters.',
          domain: 'products',
          queryKey,
          tags: ['products', 'metadata', 'parameters', 'multi'],
        },
      };
    }),
  }) as readonly UseQueryResult<ProductParameter[], Error>[];

  return {
    categories: readQueryData(categoryQueries),
    categoryLoading: hasLoadingQuery(categoryQueries),
    tags: readQueryData(tagQueries),
    tagLoading: hasLoadingQuery(tagQueries),
    parameters: readQueryData(parameterQueries),
    parametersLoading: hasLoadingQuery(parameterQueries),
  };
};
