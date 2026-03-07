import { NextRequest, NextResponse } from 'next/server';

import { getTagMappingRepository } from '@/features/integrations/server';
import {
  tagMappingCreateInputSchema,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

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
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');

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
