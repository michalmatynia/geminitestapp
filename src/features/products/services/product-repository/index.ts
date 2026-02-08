import 'server-only';

import { ErrorSystem } from '@/features/observability/server';
import { getProductDataProvider, type ProductDbProvider } from '@/features/products/services/product-provider';
import { mongoProductRepository } from '@/features/products/services/product-repository/mongo-product-repository';
import { prismaProductRepository } from '@/features/products/services/product-repository/prisma-product-repository';
import type { ProductRepository } from '@/features/products/types/services/product-repository';

export const getProductRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ProductRepository> => {
  try {
    const provider = providerOverride ?? await getProductDataProvider();
    if (provider === 'mongodb') {
      return mongoProductRepository;
    }
    return prismaProductRepository;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-repository',
      action: 'getProductRepository',
      providerOverride,
    });
    throw error;
  }
};
