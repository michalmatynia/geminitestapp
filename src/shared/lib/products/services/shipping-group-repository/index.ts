import 'server-only';

import type { ShippingGroupRepository } from '@/shared/contracts/products';
import { type ProductDbProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoShippingGroupRepository } from './mongo-shipping-group-repository';

export const getShippingGroupRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ShippingGroupRepository> => {
  try {
    void providerOverride;
    return mongoShippingGroupRepository;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'shipping-group-repository',
      action: 'getShippingGroupRepository',
      providerOverride,
    });
    throw error;
  }
};
