import type { ProducerMapping, ProducerMappingCreateInput } from '@/shared/contracts/integrations/producers';
import { badRequestError } from '@/shared/errors/app-error';

import {
  connectionIdQuerySchema,
  type ConnectionIdQuery,
} from '@/shared/validations/product-metadata-api-schemas';
import { type MarketplaceMappingSaveResult } from '../marketplace-api.types';

export type ProducerMappingCreateFields = {
  connectionId: string;
  externalProducerId: string;
  internalProducerId: string;
};

export type ProducerMappingSaveRepository = {
  getByInternalProducer: (
    connectionId: string,
    internalProducerId: string
  ) => Promise<ProducerMapping | null>;
  update: (
    id: string,
    input: { externalProducerId: string; isActive: true }
  ) => Promise<ProducerMapping>;
  create: (input: ProducerMappingCreateFields) => Promise<ProducerMapping>;
};

export type ProducerMappingSaveResult = MarketplaceMappingSaveResult<ProducerMapping>;

export const parseMarketplaceProducerMappingsQuery = (
  rawQuery: unknown
): ConnectionIdQuery => {
  const query = connectionIdQuerySchema.safeParse(rawQuery);
  if (!query.success) {
    throw badRequestError('Invalid marketplace producer mappings query.', {
      errors: query.error.flatten(),
    });
  }

  return query.data;
};

export const requireProducerMappingCreateFields = (
  input: ProducerMappingCreateInput
): ProducerMappingCreateFields => {
  const { connectionId, externalProducerId, internalProducerId } = input;

  if (!connectionId || !externalProducerId || !internalProducerId) {
    throw badRequestError('connectionId, externalProducerId, and internalProducerId are required');
  }

  return {
    connectionId,
    externalProducerId,
    internalProducerId,
  };
};

export const saveProducerMapping = async (
  repo: ProducerMappingSaveRepository,
  input: ProducerMappingCreateFields
): Promise<ProducerMappingSaveResult> => {
  const existing = await repo.getByInternalProducer(input.connectionId, input.internalProducerId);
  if (existing) {
    const updated = await repo.update(existing.id, {
      externalProducerId: input.externalProducerId,
      isActive: true,
    });
    return { body: updated, status: 200 };
  }

  const mapping = await repo.create(input);
  return { body: mapping, status: 201 };
};
