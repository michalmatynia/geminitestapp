import 'server-only';

import type { TitleTermRepository } from '@/shared/contracts/products/drafts';
import { type ProductDbProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoTitleTermRepository } from './mongo-title-term-repository';

export const getTitleTermRepository = async (
  providerOverride?: ProductDbProvider
): Promise<TitleTermRepository> => {
  try {
    void providerOverride;
    return mongoTitleTermRepository;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'title-term-repository',
      action: 'getTitleTermRepository',
      providerOverride,
    });
    throw error;
  }
};
