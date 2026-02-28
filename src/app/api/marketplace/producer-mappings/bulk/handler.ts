import { NextRequest, NextResponse } from 'next/server';

import { getProducerMappingRepository } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, validationError } from '@/shared/errors/app-error';

type BulkProducerMappingRequest = {
  connectionId: string;
  mappings: { internalProducerId: string; externalProducerId: string | null }[];
};

/**
 * POST /api/marketplace/producer-mappings/bulk
 * Creates or updates multiple producer mappings at once.
 */
export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const body = (await request.json()) as BulkProducerMappingRequest;
  const { connectionId, mappings } = body;

  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw validationError('mappings array is required and must not be empty');
  }

  for (const mapping of mappings) {
    if (!mapping.internalProducerId || mapping.externalProducerId === undefined) {
      throw validationError(
        'Each mapping must have internalProducerId and externalProducerId (or null to unmap)'
      );
    }
    if (
      mapping.externalProducerId !== null &&
      typeof mapping.externalProducerId === 'string' &&
      mapping.externalProducerId.trim().length === 0
    ) {
      throw validationError('externalProducerId cannot be an empty string');
    }
  }

  const repo = getProducerMappingRepository();
  const upsertedCount = await repo.bulkUpsert(connectionId, mappings);

  return NextResponse.json({
    success: true,
    upserted: upsertedCount,
    message: `Successfully saved ${upsertedCount} producer mappings`,
  });
}
