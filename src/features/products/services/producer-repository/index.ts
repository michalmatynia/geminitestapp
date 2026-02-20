import 'server-only';

import { ErrorSystem } from '@/features/observability/server';
import { getProductDataProvider, type ProductDbProvider } from '@/features/products/services/product-provider';
import type { ProducerRepository } from '@/shared/contracts/products';

import { mongoProducerRepository } from './mongo-producer-repository';
import { prismaProducerRepository } from './prisma-producer-repository';

export const getProducerRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ProducerRepository> => {
  try {
    const provider = providerOverride ?? await getProductDataProvider();
    if (provider === 'mongodb') {
      return mongoProducerRepository;
    }
    return prismaProducerRepository;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'producer-repository',
      action: 'getProducerRepository',
      providerOverride,
    });
    throw error;
  }
};
