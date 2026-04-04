import { z } from 'zod';

import { badRequestError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

const marketplaceConnectionListQuerySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
});

export type MarketplaceConnectionListQuery = {
  connectionId: string;
};

export const parseMarketplaceConnectionListQuery = (
  rawQuery: unknown,
  invalidMessage: string
): MarketplaceConnectionListQuery => {
  const query = marketplaceConnectionListQuerySchema.safeParse(rawQuery);
  if (!query.success) {
    throw badRequestError(invalidMessage, {
      errors: query.error.flatten(),
    });
  }

  const { connectionId } = query.data;
  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  return { connectionId };
};
