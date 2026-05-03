import type { ProducerMapping, ProducerMappingCreateInput } from '@/shared/contracts/integrations/producers';
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

export type ProducerMappingCreateFields = {
  connectionId: string;
  externalProducerId: string;
  internalProducerId: string;
};

export type ProducerMappingUpdateFields = {
  externalProducerId: string;
  isActive: true;
};

export type ProducerMappingSaveRepository = MarketplaceMappingSaveRepository<
  ProducerMapping,
  ProducerMappingCreateFields,
  ProducerMappingUpdateFields
> & {
  getByInternalProducer: (
    connectionId: string,
    internalProducerId: string
  ) => Promise<ProducerMapping | null>;
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
): Promise<ProducerMappingSaveResult> =>
  saveMarketplaceMapping(
    repo,
    () => repo.getByInternalProducer(input.connectionId, input.internalProducerId),
    input,
    { externalProducerId: input.externalProducerId, isActive: true }
  );
