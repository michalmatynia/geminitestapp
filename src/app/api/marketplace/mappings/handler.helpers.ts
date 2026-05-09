import type { CategoryMapping, CategoryMappingCreateInput } from '@/shared/contracts/integrations/listings';
import type { CategoryMappingRepository } from '@/shared/contracts/integrations/repositories';
import { badRequestError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { normalizeIntegrationSlug, TRADERA_BROWSER_INTEGRATION_SLUG } from '@/shared/lib/integration-slugs';

import {
  marketplaceConnectionQuerySchema,
  type MarketplaceMappingSaveResult,
  type MarketplaceMappingSaveRepository,
  saveMarketplaceMapping,
} from '../marketplace-api.types';

const marketplaceMappingsQuerySchema = marketplaceConnectionQuerySchema.extend({
  catalogId: optionalTrimmedQueryString(),
  marketplace: optionalTrimmedQueryString(),
});

export type MarketplaceMappingsListQuery = {
  connectionId: string | null;
  marketplace: string | null;
  catalogId?: string | undefined;
};

export type CategoryMappingCreateFields = {
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
  catalogId: string;
};

export type CategoryMappingUpdateFields = {
  internalCategoryId: string;
  isActive: true;
};

export type CategoryMappingSaveResult = MarketplaceMappingSaveResult<CategoryMapping>;

type CategoryMappingSaveRepository = MarketplaceMappingSaveRepository<
  CategoryMapping,
  CategoryMappingCreateFields,
  CategoryMappingUpdateFields
> &
  Pick<CategoryMappingRepository, 'getByExternalCategory'>;

export const parseMarketplaceMappingsQuery = (
  rawQuery: unknown
): MarketplaceMappingsListQuery => {
  const query = marketplaceMappingsQuerySchema.safeParse(rawQuery);
  if (!query.success) {
    throw badRequestError('Invalid marketplace mappings query.', {
      errors: query.error.flatten(),
    });
  }

  const { connectionId, catalogId, marketplace } = query.data;
  const normalizedMarketplace = normalizeIntegrationSlug(marketplace);
  const marketplaceScope =
    normalizedMarketplace === TRADERA_BROWSER_INTEGRATION_SLUG ? normalizedMarketplace : null;
  const hasConnectionId = typeof connectionId === 'string' && connectionId.length > 0;
  const hasCatalogId = typeof catalogId === 'string' && catalogId.length > 0;

  if (!hasConnectionId && marketplaceScope === null) {
    throw badRequestError('connectionId is required');
  }

  return {
    connectionId: hasConnectionId ? connectionId : null,
    marketplace: marketplaceScope,
    ...(hasCatalogId && marketplaceScope !== TRADERA_BROWSER_INTEGRATION_SLUG
      ? { catalogId }
      : {}),
  };
};

export const requireCategoryMappingCreateFields = (
  input: CategoryMappingCreateInput
): CategoryMappingCreateFields => {
  const { connectionId, externalCategoryId, internalCategoryId, catalogId } = input;

  if (
    connectionId.length === 0 ||
    externalCategoryId.length === 0 ||
    internalCategoryId === null ||
    internalCategoryId.length === 0 ||
    catalogId.length === 0
  ) {
    throw badRequestError(
      'connectionId, externalCategoryId, internalCategoryId, and catalogId are required'
    );
  }

  return {
    connectionId,
    externalCategoryId,
    internalCategoryId,
    catalogId,
  };
};

export const saveCategoryMapping = async (
  repo: CategoryMappingSaveRepository,
  input: CategoryMappingCreateFields
): Promise<CategoryMappingSaveResult> =>
  saveMarketplaceMapping(
    repo,
    () => repo.getByExternalCategory(input.connectionId, input.externalCategoryId, input.catalogId),
    input,
    { internalCategoryId: input.internalCategoryId, isActive: true }
  );
