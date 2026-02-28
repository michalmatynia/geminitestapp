import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';
import { mongoProductRepository } from '@/shared/lib/products/services/product-repository/mongo-product-repository';
import { prismaProductRepository } from '@/shared/lib/products/services/product-repository/prisma-product-repository';
import type { ProductRepository } from '@/shared/contracts/products';

export const getProductRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ProductRepository> => {
  try {
    const provider = providerOverride ?? (await getProductDataProvider());
    if (provider === 'mongodb') {
      return mongoProductRepository;
    }
    return prismaProductRepository;
  } catch (error) {
    await (ErrorSystem as any).captureException(error, {
      service: 'product-repository',
      action: 'getProductRepository',
      providerOverride,
    });
    throw error;
  }
};
