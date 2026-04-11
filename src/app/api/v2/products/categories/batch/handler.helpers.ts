import { z } from 'zod';

import type { ProductCategory } from '@/shared/contracts/products/categories';
import { badRequestError } from '@/shared/errors/app-error';
import {
  catalogIdsQuerySchema,
  freshQuerySchema,
} from '@/shared/validations/product-metadata-api-schemas';

const MAX_CATALOG_IDS = 25;

export const querySchema = catalogIdsQuerySchema.extend({
  fresh: freshQuerySchema.default(false),
});

export const productCategoryBatchQuerySchema = querySchema;

export type ProductCategoryBatchQuery = z.infer<typeof querySchema>;

export const parseProductCategoryBatchCatalogIds = (
  query: ProductCategoryBatchQuery | undefined
): string[] => {
  const rawParam = query?.catalogIds ?? '';
  if (!rawParam) {
    throw badRequestError('catalogIds query parameter is required');
  }

  const catalogIds = rawParam
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (catalogIds.length === 0) {
    throw badRequestError('catalogIds must contain at least one ID');
  }
  if (catalogIds.length > MAX_CATALOG_IDS) {
    throw badRequestError(`catalogIds may contain at most ${MAX_CATALOG_IDS} IDs`);
  }

  return catalogIds;
};

export const shouldFetchFreshProductCategoryBatch = (
  query: Pick<ProductCategoryBatchQuery, 'fresh'> | undefined
): boolean => query?.fresh ?? false;

export const buildProductCategoryBatchResponse = (
  results: Array<[string, ProductCategory[]]>
): Record<string, ProductCategory[]> => Object.fromEntries(results);
