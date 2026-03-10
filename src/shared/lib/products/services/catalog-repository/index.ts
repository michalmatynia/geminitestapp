import 'server-only';

import type { CatalogRepository } from '@/shared/contracts/products';
import { mongoCatalogRepository } from '@/shared/lib/products/services/catalog-repository/mongo-catalog-repository';
import { prismaCatalogRepository } from '@/shared/lib/products/services/catalog-repository/prisma-catalog-repository';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';

export const getCatalogRepository = async (
  providerOverride?: ProductDbProvider
): Promise<CatalogRepository> => {
  const provider = providerOverride ?? (await getProductDataProvider());
  if (provider === 'mongodb') {
    return mongoCatalogRepository;
  }
  return prismaCatalogRepository;
};
