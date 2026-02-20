import 'server-only';

import { ErrorSystem } from '@/features/observability/server';
import { getProductDataProvider, type ProductDbProvider } from '@/features/products/services/product-provider';
import type { CategoryRepository } from '@/shared/contracts/products/services/category-repository';

import { mongoCategoryRepository } from './mongo-category-repository';
import { prismaCategoryRepository } from './prisma-category-repository';

export const getCategoryRepository = async (
  providerOverride?: ProductDbProvider
): Promise<CategoryRepository> => {
  try {
    const provider = providerOverride ?? await getProductDataProvider();
    if (provider === 'mongodb') {
      return mongoCategoryRepository;
    }
    return prismaCategoryRepository;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'category-repository',
      action: 'getCategoryRepository',
      providerOverride,
    });
    throw error;
  }
};
