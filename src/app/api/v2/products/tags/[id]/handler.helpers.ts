import { z } from 'zod';

import type { CatalogNamedDto } from '@/shared/contracts/base';
import type { ProductTag, ProductTagUpdateInput } from '@/shared/contracts/products';
import { conflictError, validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Tag id is required'),
});

type ProductTagSnapshot = Pick<ProductTag, 'id' | 'catalogId'>;

export type ProductTagNameLookupInput = CatalogNamedDto;

export const parseTagId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }

  return parsed.data.id;
};

export const buildProductTagNameLookupInput = (
  current: ProductTagSnapshot,
  data: ProductTagUpdateInput
): ProductTagNameLookupInput | null => {
  if (data.name === undefined) return null;

  return {
    catalogId: data.catalogId ?? current.catalogId,
    name: data.name,
  };
};

export const assertAvailableProductTagName = (
  existing: Pick<ProductTag, 'id'> | null,
  tagId: string,
  lookup: ProductTagNameLookupInput
): void => {
  if (!existing || existing.id === tagId) return;

  throw conflictError('A tag with this name already exists in this catalog', {
    name: lookup.name,
    catalogId: lookup.catalogId,
  });
};

export const buildProductTagUpdateInput = (
  data: ProductTagUpdateInput
): ProductTagUpdateInput => ({
  ...(data.name !== undefined ? { name: data.name } : {}),
  ...(data.color !== undefined ? { color: data.color } : {}),
});
