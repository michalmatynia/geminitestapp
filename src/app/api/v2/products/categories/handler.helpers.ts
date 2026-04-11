import { z } from 'zod';

import type { ProductCategory, ProductCategoryCreateInput } from '@/shared/contracts/products/categories';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import {
  catalogIdQuerySchema,
  type CatalogIdQuery,
  freshQuerySchema,
} from '@/shared/validations/product-metadata-api-schemas';

export const querySchema = catalogIdQuerySchema.extend({
  fresh: freshQuerySchema,
});

export type ProductCategoriesQuery = z.infer<typeof querySchema>;

export const requireProductCategoryCatalogId = (
  query: CatalogIdQuery | undefined
): string => {
  const catalogId = query?.catalogId ?? '';
  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  return catalogId;
};

export const shouldUseFreshProductCategoryFetch = (
  query: { fresh?: boolean } | undefined
): boolean => query?.fresh === true;

export const normalizeCategoryCreateName = (data: ProductCategoryCreateInput): string => {
  const normalizedName = data.name.trim();
  if (!normalizedName) {
    throw badRequestError('Category name is required');
  }

  return normalizedName;
};

export const assertAvailableProductCategoryCreateName = (
  existing: Pick<ProductCategory, 'id'> | null,
  name: string,
  parentId: string | null,
  catalogId: string
): void => {
  if (!existing) return;

  throw conflictError('A category with this name already exists at this level', {
    name,
    parentId,
    catalogId,
  });
};

export const buildProductCategoryCreateInput = (
  data: ProductCategoryCreateInput,
  normalizedName: string
): ProductCategoryCreateInput => ({
  name: normalizedName,
  ...(data.name_pl !== undefined ? { name_pl: data.name_pl } : {}),
  catalogId: data.catalogId,
  color: data.color ?? null,
  parentId: data.parentId ?? null,
  ...(data.description !== undefined ? { description: data.description } : {}),
  ...(data.sortIndex !== undefined ? { sortIndex: data.sortIndex } : {}),
});

export const buildServerTiming = (entries: Record<string, number | null | undefined>): string =>
  Object.entries(entries)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`)
    .join(', ');

export const attachTimingHeaders = (
  response: Response,
  entries: Record<string, number | null | undefined>
): void => {
  const value = buildServerTiming(entries);
  if (value) {
    response.headers.set('Server-Timing', value);
  }
};
