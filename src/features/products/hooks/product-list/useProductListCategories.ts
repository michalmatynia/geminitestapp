'use client';
'use no memo';

import { useMemo } from 'react';

import {
  buildCategoryNameById,
  resolveCategoryLabelByLocale,
  resolveCategoryRecordId,
  resolveProductCatalogId,
  resolveProductCategoryId,
} from '@/features/products/hooks/product-list-state-utils';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

// This category lookup hook mixes derived maps with a query-backed fallback.
// Opt out of React Compiler memoization to keep the products list hook graph
// stable in development.

const PRODUCT_CATEGORY_BATCH_TIMEOUT_MS = 60_000;

export function useProductListCategories({
  data,
  nameLocale,
  enabled = true,
}: {
  data: ProductWithImages[];
  nameLocale?: string;
  enabled?: boolean;
}) {
  const locale = (nameLocale ?? 'name_en') as 'name_en' | 'name_pl' | 'name_de';

  const embeddedCategoryNameById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    data.forEach((product: ProductWithImages) => {
      const category = product.category;
      if (!category || typeof category !== 'object' || Array.isArray(category)) return;

      const categoryId = resolveCategoryRecordId(category);
      if (!categoryId || map.has(categoryId)) return;

      const label = resolveCategoryLabelByLocale(category, locale);
      if (!label) return;

      map.set(categoryId, label);
    });
    return map;
  }, [data, locale]);

  const categoryLookupCatalogIds = useMemo((): string[] => {
    const ids = new Set<string>();
    data.forEach((product: ProductWithImages) => {
      const categoryId = resolveProductCategoryId(product);
      if (!categoryId || embeddedCategoryNameById.has(categoryId)) return;

      const catalogId = resolveProductCatalogId(product);
      if (!catalogId) return;
      ids.add(catalogId);
    });
    return Array.from(ids).sort();
  }, [data, embeddedCategoryNameById]);

  const batchCategoryQueryKey = useMemo(
    () =>
      normalizeQueryKey([
        ...QUERY_KEYS.products.metadata.all,
        'categories-batch',
        categoryLookupCatalogIds,
      ]),
    [categoryLookupCatalogIds]
  );

  const categoryBatchQuery = createListQueryV2<ProductCategory, Record<string, ProductCategory[]>>({
    queryKey: batchCategoryQueryKey,
    queryFn: ({ signal }): Promise<Record<string, ProductCategory[]>> => {
      if (categoryLookupCatalogIds.length === 0) return Promise.resolve({});
      return api.get<Record<string, ProductCategory[]>>(
        `/api/v2/products/categories/batch?catalogIds=${categoryLookupCatalogIds.map(encodeURIComponent).join(',')}`,
        {
          signal,
          timeout: PRODUCT_CATEGORY_BATCH_TIMEOUT_MS,
        }
      );
    },
    staleTime: 5 * 60 * 1_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: enabled && categoryLookupCatalogIds.length > 0,
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
    if (embeddedCategoryNameById.size === 0) return fetchedCategoryNameById;

    const merged = new Map(fetchedCategoryNameById);
    embeddedCategoryNameById.forEach((label: string, categoryId: string) => {
      merged.set(categoryId, label);
    });
    return merged;
  }, [categoryBatchQuery.data, embeddedCategoryNameById, locale]);

  return {
    categoryNameById,
  };
}
