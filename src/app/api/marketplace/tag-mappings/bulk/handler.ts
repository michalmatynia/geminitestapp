import { NextRequest, NextResponse } from 'next/server';

import { getTagMappingRepository } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, validationError } from '@/shared/errors/app-error';

type BulkTagMappingRequest = {
  connectionId: string;
  mappings: { internalTagId: string; externalTagId: string | null }[];
};

/**
 * POST /api/marketplace/tag-mappings/bulk
 * Creates or updates multiple tag mappings at once.
 */
export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const body = (await request.json()) as BulkTagMappingRequest;
  const { connectionId, mappings } = body;

  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw validationError('mappings array is required and must not be empty');
  }

  for (const mapping of mappings) {
    if (!mapping.internalTagId || mapping.externalTagId === undefined) {
      throw validationError(
        'Each mapping must have internalTagId and externalTagId (or null to unmap)'
      );
    }
    if (
      mapping.externalTagId !== null &&
      typeof mapping.externalTagId === 'string' &&
      mapping.externalTagId.trim().length === 0
    ) {
      throw validationError('externalTagId cannot be an empty string');
    }
  }

  const repo = getTagMappingRepository();
  const upsertedCount = await repo.bulkUpsert(connectionId, mappings);

  return NextResponse.json({
    success: true,
    upserted: upsertedCount,
    message: `Successfully saved ${upsertedCount} tag mappings`,
  });
}
