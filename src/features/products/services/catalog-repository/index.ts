import 'server-only';

import { mongoCatalogRepository } from '@/features/products/services/catalog-repository/mongo-catalog-repository';
import { prismaCatalogRepository } from '@/features/products/services/catalog-repository/prisma-catalog-repository';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/features/products/services/product-provider';
import type { CatalogRepository } from '@/shared/contracts/products';

export const getCatalogRepository = async (
  providerOverride?: ProductDbProvider
): Promise<CatalogRepository> => {
  const provider = providerOverride ?? (await getProductDataProvider());
  if (provider === 'mongodb') {
    return mongoCatalogRepository;
  }
  return prismaCatalogRepository;
};
