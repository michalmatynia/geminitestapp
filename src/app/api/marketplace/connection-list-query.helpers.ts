import { badRequestError } from '@/shared/errors/app-error';

import {
  connectionIdQuerySchema,
  type ConnectionIdQuery as MarketplaceConnectionListQuery,
} from '@/shared/validations/product-metadata-api-schemas';

export type { MarketplaceConnectionListQuery };

export const parseMarketplaceConnectionListQuery = (
  rawQuery: unknown,
  invalidMessage: string
): MarketplaceConnectionListQuery => {
  const query = connectionIdQuerySchema.safeParse(rawQuery);
  if (!query.success) {
    throw badRequestError(invalidMessage, {
      errors: query.error.flatten(),
    });
  }

  return query.data;
};
