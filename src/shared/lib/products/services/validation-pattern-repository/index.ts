import 'server-only';

import type { ProductValidationPatternRepository } from '@/shared/contracts/products';
import { type ProductDbProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoValidationPatternRepository } from './mongo-validation-pattern-repository';

export const getValidationPatternRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ProductValidationPatternRepository> => {
  try {
    void providerOverride;
    return mongoValidationPatternRepository;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'validation-pattern-repository',
      action: 'getValidationPatternRepository',
      providerOverride,
    });
    throw error;
  }
};
