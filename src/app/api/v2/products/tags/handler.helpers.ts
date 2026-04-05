import type { ProductTag, ProductTagCreateInput, ProductTagFilters } from '@/shared/contracts/products/tags';
import { badRequestError, conflictError } from '@/shared/errors/app-error';

const DEFAULT_PRODUCT_TAG_COLOR = '#38bdf8';

export const requireProductTagCatalogId = (query: ProductTagFilters): string => {
  const catalogId = query.catalogId;
  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  return catalogId;
};

export const assertAvailableProductTagCreateName = (
  existing: Pick<ProductTag, 'id'> | null,
  name: string,
  catalogId: string
): void => {
  if (!existing) return;

  throw conflictError('A tag with this name already exists in this catalog', {
    name,
    catalogId,
  });
};

export const buildProductTagCreateInput = (
  data: ProductTagCreateInput
): ProductTagCreateInput => ({
  name: data.name,
  color: data.color ?? DEFAULT_PRODUCT_TAG_COLOR,
  catalogId: data.catalogId,
});
