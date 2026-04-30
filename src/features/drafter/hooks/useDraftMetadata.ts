'use client';

import type { QueryKey, UseQueryResult } from '@tanstack/react-query';

import { getCategoriesFlat, getParameters, getTags } from '@/features/products/forms.public';
import { api } from '@/shared/lib/api-client';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductParameter, ProductSimpleParameter } from '@/shared/contracts/products/parameters';
import type { ProductTag } from '@/shared/contracts/products/tags';
import { createMultiQueryV2, type QueryDescriptorV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type DraftMetadataResult = {
  categories: ProductCategory[];
  categoryLoading: boolean;
  tags: ProductTag[];
  tagLoading: boolean;
  parameters: ProductParameter[];
  simpleParameters: ProductSimpleParameter[];
  parametersLoading: boolean;
};

type DraftMetadataQueryConfig<T> = {
  description: string;
  queryKeyFor: (catalogId: string) => readonly unknown[];
  queryFn: (catalogId: string) => Promise<T[]>;
  resource: string;
  source: string;
  tags: string[];
};

const readQueryData = <T,>(queries: readonly UseQueryResult<T[], Error>[]): T[] =>
  queries.flatMap((query: UseQueryResult<T[], Error>): T[] => query.data ?? []);

const hasLoadingQuery = <T,>(queries: readonly UseQueryResult<T[], Error>[]): boolean =>
  queries.some((query: UseQueryResult<T[], Error>): boolean => query.isLoading);

const useDraftMetadataQueries = <T,>(
  selectedCatalogIds: string[],
  config: DraftMetadataQueryConfig<T>
): UseQueryResult<T[], Error>[] => {
  const queries: Array<QueryDescriptorV2<unknown, unknown, unknown, QueryKey>> = selectedCatalogIds.map(
    (id: string) => {
      const queryKey = normalizeQueryKey(config.queryKeyFor(id));
      return {
        queryKey,
        queryFn: async (): Promise<unknown> => await config.queryFn(id),
        meta: {
          source: config.source,
          operation: 'list',
          resource: config.resource,
          description: config.description,
          domain: 'products',
          queryKey,
          tags: config.tags,
        },
      };
    }
  );

  return createMultiQueryV2({ queries });
};

const listSimpleParameters = async (catalogId: string): Promise<ProductSimpleParameter[]> =>
  await api.get<ProductSimpleParameter[]>('/api/v2/products/simple-parameters', {
    params: { catalogId },
    cache: 'no-store',
  });

export const useDraftMetadata = (selectedCatalogIds: string[]): DraftMetadataResult => {
  const categoryQueries = useDraftMetadataQueries<ProductCategory>(selectedCatalogIds, {
    queryKeyFor: QUERY_KEYS.products.metadata.categories,
    queryFn: getCategoriesFlat,
    source: 'drafter.hooks.useDraftMetadata.categories',
    resource: 'products.metadata.categories',
    description: 'Loads products metadata categories.',
    tags: ['products', 'metadata', 'categories', 'multi'],
  });
  const tagQueries = useDraftMetadataQueries<ProductTag>(selectedCatalogIds, {
    queryKeyFor: QUERY_KEYS.products.metadata.tags,
    queryFn: getTags,
    source: 'drafter.hooks.useDraftMetadata.tags',
    resource: 'products.metadata.tags',
    description: 'Loads products metadata tags.',
    tags: ['products', 'metadata', 'tags', 'multi'],
  });
  const parameterQueries = useDraftMetadataQueries<ProductParameter>(selectedCatalogIds, {
    queryKeyFor: QUERY_KEYS.products.metadata.parameters,
    queryFn: getParameters,
    source: 'drafter.hooks.useDraftMetadata.parameters',
    resource: 'products.metadata.parameters',
    description: 'Loads products metadata parameters.',
    tags: ['products', 'metadata', 'parameters', 'multi'],
  });
  const simpleParameterQueries = useDraftMetadataQueries<ProductSimpleParameter>(selectedCatalogIds, {
    queryKeyFor: QUERY_KEYS.products.metadata.simpleParameters,
    queryFn: listSimpleParameters,
    source: 'drafter.hooks.useDraftMetadata.simpleParameters',
    resource: 'products.metadata.simple-parameters',
    description: 'Loads products metadata simple parameters.',
    tags: ['products', 'metadata', 'simple-parameters', 'multi'],
  });

  return {
    categories: readQueryData(categoryQueries),
    categoryLoading: hasLoadingQuery(categoryQueries),
    tags: readQueryData(tagQueries),
    tagLoading: hasLoadingQuery(tagQueries),
    parameters: readQueryData(parameterQueries),
    simpleParameters: readQueryData(simpleParameterQueries),
    parametersLoading: hasLoadingQuery(parameterQueries) || hasLoadingQuery(simpleParameterQueries),
  };
};
