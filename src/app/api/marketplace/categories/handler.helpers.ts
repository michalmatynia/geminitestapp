import { z } from 'zod';

import type { ExternalCategoryRepository } from '@/shared/contracts/integrations/repositories';
import { badRequestError } from '@/shared/errors/app-error';
import {
  optionalBooleanQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import { normalizeIntegrationSlug, TRADERA_BROWSER_INTEGRATION_SLUG } from '@/shared/lib/integration-slugs';

const marketplaceCategoriesQuerySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
  marketplace: optionalTrimmedQueryString(),
  tree: optionalBooleanQuerySchema().default(false),
});

export type MarketplaceCategoriesQuery = {
  connectionId: string | null;
  marketplace: string | null;
  tree: boolean;
};

type CategoryListRepository = Pick<
  ExternalCategoryRepository,
  'listByConnection' | 'getTreeByConnection' | 'listByMarketplace' | 'getTreeByMarketplace'
>;

export const parseMarketplaceCategoriesQuery = (
  rawQuery: unknown
): MarketplaceCategoriesQuery => {
  const query = marketplaceCategoriesQuerySchema.safeParse(rawQuery);
  if (!query.success) {
    throw badRequestError('Invalid marketplace categories query.', {
      errors: query.error.flatten(),
    });
  }

  const { connectionId, marketplace, tree } = query.data;
  const normalizedMarketplace = normalizeIntegrationSlug(marketplace);
  const marketplaceScope =
    normalizedMarketplace === TRADERA_BROWSER_INTEGRATION_SLUG ? normalizedMarketplace : null;

  if (!connectionId && !marketplaceScope) {
    throw badRequestError('connectionId is required');
  }

  return {
    connectionId: connectionId ?? null,
    marketplace: marketplaceScope,
    tree,
  };
};

export const listMarketplaceCategories = (
  repo: CategoryListRepository,
  query: MarketplaceCategoriesQuery
) => {
  if (query.marketplace === TRADERA_BROWSER_INTEGRATION_SLUG) {
    return query.tree
      ? repo.getTreeByMarketplace(query.marketplace)
      : repo.listByMarketplace(query.marketplace);
  }

  if (!query.connectionId) {
    throw badRequestError('connectionId is required');
  }

  return query.tree
    ? repo.getTreeByConnection(query.connectionId)
    : repo.listByConnection(query.connectionId);
};
