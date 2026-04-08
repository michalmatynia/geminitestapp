import 'server-only';

import type { CustomFieldRepository } from '@/shared/contracts/products/drafts';
import { type ProductDbProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoProductCustomFieldRepository } from './mongo-product-custom-field-repository';

export const getCustomFieldRepository = async (
  providerOverride?: ProductDbProvider
): Promise<CustomFieldRepository> => {
  try {
    void providerOverride;
    return mongoProductCustomFieldRepository;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'custom-field-repository',
      action: 'getCustomFieldRepository',
      providerOverride,
    });
    throw error;
  }
};
