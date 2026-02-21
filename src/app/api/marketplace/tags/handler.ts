import { NextRequest, NextResponse } from 'next/server';

import { getExternalTagRepository } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

/**
 * GET /api/marketplace/tags
 * Lists external tags for a given connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 */
export async function GET_handler(request: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  const repo = getExternalTagRepository();
  const tags = await repo.listByConnection(connectionId);
  return NextResponse.json(tags);
}
