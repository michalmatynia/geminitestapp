import 'server-only';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { getCatalogRepository } from '@/shared/lib/products/services/catalog-repository';

const trimString = (value: string | null | undefined): string => value?.trim() ?? '';

const resolveProductCatalogId = (product: ProductWithImages): string | null => {
  const catalogId = trimString(product.catalogId);
  if (catalogId.length > 0) return catalogId;
  const relationCatalogId = trimString(product.catalogs[0]?.catalogId);
  return relationCatalogId.length > 0 ? relationCatalogId : null;
};

export const hydrateProductPricingForExport = async (
  product: ProductWithImages
): Promise<ProductWithImages> => {
  if (trimString(product.defaultPriceGroupId).length > 0) return product;

  const catalogId = resolveProductCatalogId(product);
  if (catalogId === null) return product;

  const catalogRepository = await getCatalogRepository();
  const catalog = await catalogRepository.getCatalogById(catalogId);
  const defaultPriceGroupId = trimString(catalog?.defaultPriceGroupId);
  if (defaultPriceGroupId.length === 0) return product;

  return { ...product, defaultPriceGroupId };
};
