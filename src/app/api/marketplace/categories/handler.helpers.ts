import { z } from 'zod';

import type { ExternalCategoryRepository } from '@/shared/contracts/integrations';
import { badRequestError } from '@/shared/errors/app-error';
import {
  optionalBooleanQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

const marketplaceCategoriesQuerySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
  tree: optionalBooleanQuerySchema().default(false),
});

export type MarketplaceCategoriesQuery = {
  connectionId: string;
  tree: boolean;
};

type CategoryListRepository = Pick<ExternalCategoryRepository, 'listByConnection' | 'getTreeByConnection'>;

export const parseMarketplaceCategoriesQuery = (
  rawQuery: unknown
): MarketplaceCategoriesQuery => {
  const query = marketplaceCategoriesQuerySchema.safeParse(rawQuery);
  if (!query.success) {
    throw badRequestError('Invalid marketplace categories query.', {
      errors: query.error.flatten(),
    });
  }

  const { connectionId, tree } = query.data;
  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  return {
    connectionId,
    tree,
  };
};

export const listMarketplaceCategories = (
  repo: CategoryListRepository,
  query: MarketplaceCategoriesQuery
) => {
  return query.tree ? repo.getTreeByConnection(query.connectionId) : repo.listByConnection(query.connectionId);
};
