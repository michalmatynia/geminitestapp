import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';
import type { ProductValidationPatternRepository } from '@/shared/contracts/products';

import { mongoValidationPatternRepository } from './mongo-validation-pattern-repository';
import { prismaValidationPatternRepository } from './prisma-validation-pattern-repository';

export const getValidationPatternRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ProductValidationPatternRepository> => {
  try {
    const provider = providerOverride ?? (await getProductDataProvider());
    if (provider === 'mongodb') {
      return mongoValidationPatternRepository;
    }
    return prismaValidationPatternRepository;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'validation-pattern-repository',
      action: 'getValidationPatternRepository',
      providerOverride,
    });
    throw error;
  }
};
