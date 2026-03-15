import 'server-only';

import type { ProducerRepository } from '@/shared/contracts/products';
import { type ProductDbProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoProducerRepository } from './mongo-producer-repository';

export const getProducerRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ProducerRepository> => {
  try {
    void providerOverride;
    return mongoProducerRepository;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'producer-repository',
      action: 'getProducerRepository',
      providerOverride,
    });
    throw error;
  }
};
