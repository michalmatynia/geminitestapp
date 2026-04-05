import 'server-only';

import type { CategoryRepository } from '@/shared/contracts/products/drafts';
import { type ProductDbProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoCategoryRepository } from './mongo-category-repository';

export const getCategoryRepository = async (
  providerOverride?: ProductDbProvider
): Promise<CategoryRepository> => {
  try {
    void providerOverride;
    return mongoCategoryRepository;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'category-repository',
      action: 'getCategoryRepository',
      providerOverride,
    });
    throw error;
  }
};
