export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getExternalTagRepository } from '@/features/integrations/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

/**
 * GET /api/marketplace/tags
 * Lists external tags for a given connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 */
async function GET_handler(request: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  const repo = getExternalTagRepository();
  const tags = await repo.listByConnection(connectionId);
  return NextResponse.json(tags);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'marketplace.tags.GET' }
);
