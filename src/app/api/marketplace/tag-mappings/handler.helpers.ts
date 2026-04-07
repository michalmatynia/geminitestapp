import type { TagMapping, TagMappingCreateInput } from '@/shared/contracts/integrations/listings';
import { badRequestError } from '@/shared/errors/app-error';

import {
  connectionIdQuerySchema,
  type ConnectionIdQuery,
} from '@/shared/validations/product-metadata-api-schemas';
import { type MarketplaceMappingSaveResult } from '../marketplace-api.types';

export type TagMappingCreateFields = {
  connectionId: string;
  externalTagId: string;
  internalTagId: string;
};

export type TagMappingSaveRepository = {
  getByInternalTag: (connectionId: string, internalTagId: string) => Promise<TagMapping | null>;
  update: (
    id: string,
    input: { externalTagId: string; isActive: true }
  ) => Promise<TagMapping>;
  create: (input: TagMappingCreateFields) => Promise<TagMapping>;
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
): Promise<TagMappingSaveResult> => {
  const existing = await repo.getByInternalTag(input.connectionId, input.internalTagId);
  if (existing) {
    const updated = await repo.update(existing.id, {
      externalTagId: input.externalTagId,
      isActive: true,
    });
    return { body: updated, status: 200 };
  }

  const mapping = await repo.create(input);
  return { body: mapping, status: 201 };
};
