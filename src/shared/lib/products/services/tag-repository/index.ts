import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';
import type { TagRepository } from '@/shared/contracts/products';

import { mongoTagRepository } from './mongo-tag-repository';
import { prismaTagRepository } from './prisma-tag-repository';

export const getTagRepository = async (
  providerOverride?: ProductDbProvider
): Promise<TagRepository> => {
  try {
    const provider = providerOverride ?? (await getProductDataProvider());
    if (provider === 'mongodb') {
      return mongoTagRepository;
    }
    return prismaTagRepository;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'tag-repository',
      action: 'getTagRepository',
      providerOverride,
    });
    throw error;
  }
};
