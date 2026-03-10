import 'server-only';

import type { CategoryRepository } from '@/shared/contracts/products';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoCategoryRepository } from './mongo-category-repository';
import { prismaCategoryRepository } from './prisma-category-repository';

export const getCategoryRepository = async (
  providerOverride?: ProductDbProvider
): Promise<CategoryRepository> => {
  try {
    const provider = providerOverride ?? (await getProductDataProvider());
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
