import type { ProductTag, ProductTagUpdateInput } from '@/shared/contracts/products/tags';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import type { CatalogNameLookupDto } from '@/shared/contracts/base';

export const parseTagId = (params: { id: string }): string => {
  const direct = params.id.trim();
  if (!direct) {
    throw badRequestError('Invalid route parameters: id is required');
  }
  return direct;
};

type ProductTagSnapshot = Pick<ProductTag, 'id' | 'catalogId'>;

export const buildProductTagNameLookupInput = (
  current: ProductTagSnapshot,
  data: ProductTagUpdateInput
): CatalogNameLookupDto | null => {
  if (data.name === undefined) return null;

  return {
    catalogId: data.catalogId ?? current.catalogId,
    name: data.name,
  };
};

export const assertAvailableProductTagName = (
  existing: Pick<ProductTag, 'id'> | null,
  tagId: string,
  lookup: CatalogNameLookupDto
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
