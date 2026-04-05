import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getTagMappingRepository } from '@/features/integrations/server';
import { tagMappingCreateInputSchema } from '@/shared/contracts/integrations/listings';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

const querySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
});

/**
 * GET /api/marketplace/tag-mappings
 * Lists tag mappings for a connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 */
export async function GET_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!query.success) {
    throw badRequestError('Invalid marketplace tag mappings query.', {
      errors: query.error.flatten(),
    });
  }

  const { connectionId } = query.data;

  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  const repo = getTagMappingRepository();
  const mappings = await repo.listByConnection(connectionId);
  return NextResponse.json(mappings);
}

/**
 * POST /api/marketplace/tag-mappings
 * Creates or updates a tag mapping.
 */
export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(request, tagMappingCreateInputSchema, {
    logPrefix: 'marketplace.tag-mappings.create',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { connectionId, externalTagId, internalTagId } = parsed.data;

  if (!connectionId || !externalTagId || !internalTagId) {
    throw badRequestError('connectionId, externalTagId, and internalTagId are required');
  }

  const repo = getTagMappingRepository();

  const existing = await repo.getByInternalTag(connectionId, internalTagId);
  if (existing) {
    const updated = await repo.update(existing.id, {
      externalTagId,
      isActive: true,
    });
    return NextResponse.json(updated);
  }

  const mapping = await repo.create({
    connectionId,
    externalTagId,
    internalTagId,
  });
  return NextResponse.json(mapping, { status: 201 });
}
