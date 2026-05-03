import type { TagMapping, TagMappingCreateInput } from '@/shared/contracts/integrations/listings';
import { badRequestError } from '@/shared/errors/app-error';

import {
  connectionIdQuerySchema,
  type ConnectionIdQuery,
} from '@/shared/validations/product-metadata-api-schemas';
import {
  type MarketplaceMappingSaveResult,
  type MarketplaceMappingSaveRepository,
  saveMarketplaceMapping,
} from '../marketplace-api.types';

export type TagMappingCreateFields = {
  connectionId: string;
  externalTagId: string;
  internalTagId: string;
};

export type TagMappingUpdateFields = {
  externalTagId: string;
  isActive: true;
};

export type TagMappingSaveRepository = MarketplaceMappingSaveRepository<
  TagMapping,
  TagMappingCreateFields,
  TagMappingUpdateFields
> & {
  getByInternalTag: (connectionId: string, internalTagId: string) => Promise<TagMapping | null>;
};

export type TagMappingSaveResult = MarketplaceMappingSaveResult<TagMapping>;

export const parseMarketplaceTagMappingsQuery = (
  rawQuery: unknown
): ConnectionIdQuery => {
  const query = connectionIdQuerySchema.safeParse(rawQuery);
  if (!query.success) {
    throw badRequestError('Invalid marketplace tag mappings query.', {
      errors: query.error.flatten(),
    });
  }

  return query.data;
};

export const requireTagMappingCreateFields = (
  input: TagMappingCreateInput
): TagMappingCreateFields => {
  const { connectionId, externalTagId, internalTagId } = input;

  if (!connectionId || !externalTagId || !internalTagId) {
    throw badRequestError('connectionId, externalTagId, and internalTagId are required');
  }

  return {
    connectionId,
    externalTagId,
    internalTagId,
  };
};

export const saveTagMapping = async (
  repo: TagMappingSaveRepository,
  input: TagMappingCreateFields
): Promise<TagMappingSaveResult> =>
  saveMarketplaceMapping(
    repo,
    () => repo.getByInternalTag(input.connectionId, input.internalTagId),
    input,
    { externalTagId: input.externalTagId, isActive: true }
  );
