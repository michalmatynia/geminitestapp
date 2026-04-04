import { z } from 'zod';

import type {
  TagMapping,
  TagMappingCreateInput,
} from '@/shared/contracts/integrations';
import { badRequestError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

const marketplaceTagMappingsQuerySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
});

export type MarketplaceTagMappingsListQuery = {
  connectionId: string;
};

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

export type TagMappingSaveResult = {
  body: TagMapping;
  status: 200 | 201;
};

export const parseMarketplaceTagMappingsQuery = (
  rawQuery: unknown
): MarketplaceTagMappingsListQuery => {
  const query = marketplaceTagMappingsQuerySchema.safeParse(rawQuery);
  if (!query.success) {
    throw badRequestError('Invalid marketplace tag mappings query.', {
      errors: query.error.flatten(),
    });
  }

  const { connectionId } = query.data;
  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  return { connectionId };
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
