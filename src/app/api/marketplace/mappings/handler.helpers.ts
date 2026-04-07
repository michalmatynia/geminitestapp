import type { CategoryMapping, CategoryMappingCreateInput } from '@/shared/contracts/integrations/listings';
import type { CategoryMappingRepository } from '@/shared/contracts/integrations/repositories';
import { badRequestError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

import {
  marketplaceConnectionQuerySchema,
  type MarketplaceMappingSaveResult,
} from '../marketplace-api.types';

const marketplaceMappingsQuerySchema = marketplaceConnectionQuerySchema.extend({
  catalogId: optionalTrimmedQueryString(),
});

export type MarketplaceMappingsListQuery = {
  connectionId: string;
  catalogId?: string | undefined;
};

export type CategoryMappingCreateFields = {
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
  catalogId: string;
};

export type CategoryMappingSaveResult = MarketplaceMappingSaveResult<CategoryMapping>;

type CategoryMappingSaveRepository = Pick<
  CategoryMappingRepository,
  'getByExternalCategory' | 'update' | 'create'
>;

export const parseMarketplaceMappingsQuery = (
  rawQuery: unknown
): MarketplaceMappingsListQuery => {
  const query = marketplaceMappingsQuerySchema.safeParse(rawQuery);
  if (!query.success) {
    throw badRequestError('Invalid marketplace mappings query.', {
      errors: query.error.flatten(),
    });
  }

  const { connectionId, catalogId } = query.data;
  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  return {
    connectionId,
    ...(catalogId ? { catalogId } : {}),
  };
};

export const requireCategoryMappingCreateFields = (
  input: CategoryMappingCreateInput
): CategoryMappingCreateFields => {
  const { connectionId, externalCategoryId, internalCategoryId, catalogId } = input;

  if (!connectionId || !externalCategoryId || !internalCategoryId || !catalogId) {
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
): Promise<CategoryMappingSaveResult> => {
  const existing = await repo.getByExternalCategory(
    input.connectionId,
    input.externalCategoryId,
    input.catalogId
  );

  if (existing) {
    const updated = await repo.update(existing.id, {
      internalCategoryId: input.internalCategoryId,
      isActive: true,
    });
    return { body: updated, status: 200 };
  }

  const mapping = await repo.create(input);
  return { body: mapping, status: 201 };
};
