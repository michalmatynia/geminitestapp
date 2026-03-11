import 'server-only';

import type { CatalogRepository } from '@/shared/contracts/products';
import { mongoCatalogRepository } from '@/shared/lib/products/services/catalog-repository/mongo-catalog-repository';
import { type ProductDbProvider } from '@/shared/lib/products/services/product-provider';

export const getCatalogRepository = async (
  providerOverride?: ProductDbProvider
): Promise<CatalogRepository> => {
  void providerOverride;
  return mongoCatalogRepository;
};
