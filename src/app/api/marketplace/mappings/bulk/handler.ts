import { NextRequest, NextResponse } from 'next/server';

import { getCategoryMappingRepository } from '@/shared/lib/integrations/server';
import type { BulkCategoryMappingRequest as BulkMappingRequest } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, validationError } from '@/shared/errors/app-error';

/**
 * POST /api/marketplace/mappings/bulk
 * Creates or updates multiple category mappings at once.
 */
export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const body = (await request.json()) as BulkMappingRequest;
  const { connectionId, catalogId, mappings } = body;

  if (!connectionId || !catalogId) {
    throw badRequestError('connectionId and catalogId are required');
  }

  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw validationError('mappings array is required and must not be empty');
  }

  // Validate each mapping
  for (const mapping of mappings) {
    if (!mapping.externalCategoryId || mapping.internalCategoryId === undefined) {
      throw validationError(
        'Each mapping must have externalCategoryId and internalCategoryId (or null to unmap)'
      );
    }

    if (
      mapping.internalCategoryId !== null &&
      typeof mapping.internalCategoryId === 'string' &&
      mapping.internalCategoryId.trim().length === 0
    ) {
      throw validationError('internalCategoryId cannot be an empty string');
    }
  }

  const repo = getCategoryMappingRepository();
  const typedMappings = mappings as {
    externalCategoryId: string;
    internalCategoryId: string | null;
  }[];
  const upsertedCount = await repo.bulkUpsert(connectionId, catalogId, typedMappings);

  return NextResponse.json({
    success: true,
    upserted: upsertedCount,
    message: `Successfully saved ${upsertedCount} category mappings`,
  });
}
