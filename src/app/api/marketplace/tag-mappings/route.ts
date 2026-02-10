export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getTagMappingRepository } from '@/features/integrations/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

type CreateTagMappingRequest = {
  connectionId: string;
  externalTagId: string;
  internalTagId: string;
};

/**
 * GET /api/marketplace/tag-mappings
 * Lists tag mappings for a connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 */
async function GET_handler(request: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
async function POST_handler(request: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await request.json()) as CreateTagMappingRequest;
  const { connectionId, externalTagId, internalTagId } = body;

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

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'marketplace.tag-mappings.GET' }
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'marketplace.tag-mappings.POST' }
);
