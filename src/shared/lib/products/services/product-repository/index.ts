import 'server-only';

import type { ProductRepository } from '@/shared/contracts/products';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';
import { mongoProductRepository } from '@/shared/lib/products/services/product-repository/mongo-product-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const getProductRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ProductRepository> => {
  try {
    void (providerOverride ?? (await getProductDataProvider()));
    return mongoProductRepository;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-repository',
      action: 'getProductRepository',
      providerOverride,
    });
    throw error;
  }
};
