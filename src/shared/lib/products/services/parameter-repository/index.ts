import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';
import type { ParameterRepository } from '@/shared/contracts/products';

import { mongoParameterRepository } from './mongo-parameter-repository';
import { prismaParameterRepository } from './prisma-parameter-repository';

export const getParameterRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ParameterRepository> => {
  try {
    const provider = providerOverride ?? (await getProductDataProvider());
    if (provider === 'mongodb') {
      return mongoParameterRepository;
    }
    return prismaParameterRepository;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'parameter-repository',
      action: 'getParameterRepository',
      providerOverride,
    });
    throw error;
  }
};
