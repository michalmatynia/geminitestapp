'use client';

// useProductListCategories: resolves category filters, builds flattened and
// hierarchical category view for the product list, and exposes helpers
// for category selection and breadcrumb resolution. Keeps client-only logic
// (tree expansion, client filtering) out of server entrypoints.
'use no memo';

// useProductListCategories: derives an embedded category-name map from the
// current page of products and falls back to the shared Mentios category tree
// for any missing category labels. Keeps client-side lookups cheap and avoids
// per-row category API calls.
import { useMemo } from 'react';

import {
  buildCategoryNameById,
  resolveCategoryLabelByLocale,
  resolveCategoryRecordId,
  resolveProductCategoryId,
} from '@/features/products/hooks/product-list-state-utils';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import { DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID } from '@/shared/lib/products/default-category-tree';
import { useListQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

// This category lookup hook mixes derived maps with a query-backed fallback.
// Opt out of React Compiler memoization to keep the products list hook graph
// stable in development.

const PRODUCT_CATEGORY_BATCH_TIMEOUT_MS = 60_000;

type ProductCategoryLocale = 'name_en' | 'name_pl' | 'name_de';

type UseProductListCategoriesArgs = {
  data: ProductWithImages[];
  nameLocale?: string;
  enabled?: boolean;
  defaultCategoryCatalogId?: string | null;
};

type UseProductListCategoriesResult = {
  categoryNameById: Map<string, string>;
};

const isCategoryLikeRecord = (
  value: unknown
): value is ProductCategory | Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const buildEmbeddedCategoryNameById = (
  data: ProductWithImages[],
  locale: ProductCategoryLocale
): Map<string, string> => {
  const map = new Map<string, string>();
  data.forEach((product: ProductWithImages) => {
    const category = product.category;
    if (!isCategoryLikeRecord(category)) return;

    const categoryId = resolveCategoryRecordId(category);
    if (categoryId === '' || map.has(categoryId)) return;

    const label = resolveCategoryLabelByLocale(category, locale);
    if (label === '') return;

    map.set(categoryId, label);
  });
  return map;
};

const resolveCategoryLookupCatalogIds = (
  data: ProductWithImages[],
  embeddedCategoryNameById: Map<string, string>,
  defaultCategoryCatalogId: string | null | undefined
): string[] => {
  const normalizedDefaultCatalogId =
    typeof defaultCategoryCatalogId === 'string' ? defaultCategoryCatalogId.trim() : '';
  if (normalizedDefaultCatalogId.length === 0) return [];

  const hasMissingCategoryLabel = data.some((product: ProductWithImages) => {
    const categoryId = resolveProductCategoryId(product);
    return categoryId !== '' && !embeddedCategoryNameById.has(categoryId);
  });
  return hasMissingCategoryLabel ? [normalizedDefaultCatalogId] : [];
};

const fetchProductCategoryBatch = (
  categoryLookupCatalogIds: string[],
  signal: AbortSignal | undefined
): Promise<Record<string, ProductCategory[]>> => {
  if (categoryLookupCatalogIds.length === 0) return Promise.resolve({});
  return api.get<Record<string, ProductCategory[]>>(
    `/api/v2/products/categories/batch?catalogIds=${categoryLookupCatalogIds.map(encodeURIComponent).join(',')}`,
    {
      signal,
      timeout: PRODUCT_CATEGORY_BATCH_TIMEOUT_MS,
    }
  );
};

const mergeCategoryNameMaps = (
  fetchedCategoryNameById: Map<string, string>,
  embeddedCategoryNameById: Map<string, string>
): Map<string, string> => {
  if (embeddedCategoryNameById.size === 0) return fetchedCategoryNameById;

  const merged = new Map(fetchedCategoryNameById);
  embeddedCategoryNameById.forEach((label: string, categoryId: string) => {
    merged.set(categoryId, label);
  });
  return merged;
};

export function useProductListCategories({
  data,
  nameLocale,
  enabled = true,
  defaultCategoryCatalogId = DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID,
}: UseProductListCategoriesArgs): UseProductListCategoriesResult {
  const locale = (nameLocale ?? 'name_en') as ProductCategoryLocale;

  const embeddedCategoryNameById = useMemo(
    (): Map<string, string> => buildEmbeddedCategoryNameById(data, locale),
    [data, locale]
  );

  const categoryLookupCatalogIds = useMemo(
    (): string[] =>
      resolveCategoryLookupCatalogIds(data, embeddedCategoryNameById, defaultCategoryCatalogId),
    [data, embeddedCategoryNameById, defaultCategoryCatalogId]
  );

  const batchCategoryQueryKey = useMemo(
    () =>
      normalizeQueryKey([
        ...QUERY_KEYS.products.metadata.all,
        'categories-batch',
        categoryLookupCatalogIds,
      ]),
    [categoryLookupCatalogIds]
  );

  const categoryBatchQuery = useListQueryV2<ProductCategory, Record<string, ProductCategory[]>>({
    queryKey: batchCategoryQueryKey,
    queryFn: ({ signal }): Promise<Record<string, ProductCategory[]>> =>
      fetchProductCategoryBatch(categoryLookupCatalogIds, signal),
    staleTime: 5 * 60 * 1_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: enabled === true && categoryLookupCatalogIds.length > 0,
    meta: {
      source: 'products.hooks.useProductListCategories',
      operation: 'list',
      resource: 'products.categories.batch',
      domain: 'products',
      queryKey: batchCategoryQueryKey,
      tags: ['products', 'categories', 'batch'],
      description: 'Loads products categories batch.'},
  });

  const categoryNameById = useMemo((): Map<string, string> => {
    const grouped = categoryBatchQuery.data ?? {};
    const fetchedCategoryNameById = buildCategoryNameById(grouped, locale);
    return mergeCategoryNameMaps(fetchedCategoryNameById, embeddedCategoryNameById);
  }, [categoryBatchQuery.data, embeddedCategoryNameById, locale]);

  return {
    categoryNameById,
  };
}
