'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  resolveCategoryLabelByLocale,
  resolveProductCatalogId,
  resolveProductCategoryId,
} from '@/features/products/hooks/product-list-state-utils';
import type { ProductCategory, ProductWithImages } from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const PRODUCT_CATEGORY_BATCH_TIMEOUT_MS = 60_000;

export function useProductListCategories({
  data,
  nameLocale,
}: {
  data: ProductWithImages[];
  nameLocale?: string;
}) {
  const categoryLookupCatalogIds = useMemo((): string[] => {
    const ids = new Set<string>();
    data.forEach((product: ProductWithImages) => {
      const categoryId = resolveProductCategoryId(product);
      const catalogId = resolveProductCatalogId(product);
      if (!categoryId || !catalogId) return;
      ids.add(catalogId);
    });
    return Array.from(ids).sort();
  }, [data]);

  const batchCategoryQueryKey = useMemo(
    () =>
      normalizeQueryKey([
        ...QUERY_KEYS.products.metadata.all,
        'categories-batch',
        categoryLookupCatalogIds,
      ]),
    [categoryLookupCatalogIds]
  );

  const { data: categoryBatchData } = useQuery<Record<string, ProductCategory[]>>({
    queryKey: batchCategoryQueryKey,
    queryFn: ({ signal }): Promise<Record<string, ProductCategory[]>> => {
      if (categoryLookupCatalogIds.length === 0) return Promise.resolve({});
      return api.get<Record<string, ProductCategory[]>>(
        `/api/products/categories/batch?catalogIds=${categoryLookupCatalogIds.map(encodeURIComponent).join(',')}`,
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
    enabled: categoryLookupCatalogIds.length > 0,
  });

  const categoryNameById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    const locale = (nameLocale ?? 'name_en') as 'name_en' | 'name_pl' | 'name_de';
    const grouped = categoryBatchData ?? {};
    for (const categories of Object.values(grouped)) {
      for (const category of categories) {
        if (!category.id || map.has(category.id)) continue;
        const label = resolveCategoryLabelByLocale(category, locale);
        if (!label) continue;
        map.set(category.id, label);
      }
    }
    return map;
  }, [categoryBatchData, nameLocale]);

  return {
    categoryNameById,
  };
}
