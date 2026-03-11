import 'server-only';

import type { TagRepository } from '@/shared/contracts/products';
import { type ProductDbProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoTagRepository } from './mongo-tag-repository';

export const getTagRepository = async (
  providerOverride?: ProductDbProvider
): Promise<TagRepository> => {
  try {
    void providerOverride;
    return mongoTagRepository;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'tag-repository',
      action: 'getTagRepository',
      providerOverride,
    });
    throw error;
  }
};
