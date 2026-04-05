import 'server-only';

import type { ParameterRepository } from '@/shared/contracts/products/drafts';
import { type ProductDbProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoParameterRepository } from './mongo-parameter-repository';

export const getParameterRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ParameterRepository> => {
  try {
    void providerOverride;
    return mongoParameterRepository;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'parameter-repository',
      action: 'getParameterRepository',
      providerOverride,
    });
    throw error;
  }
};
