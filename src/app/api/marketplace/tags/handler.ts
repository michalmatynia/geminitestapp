import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getExternalTagRepository } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

const querySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
});

/**
 * GET /api/marketplace/tags
 * Lists external tags for a given connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 */
export async function GET_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!query.success) {
    throw badRequestError('Invalid marketplace tags query.', {
      errors: query.error.flatten(),
    });
  }

  const { connectionId } = query.data;

  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  const repo = getExternalTagRepository();
  const tags = await repo.listByConnection(connectionId);
  return NextResponse.json(tags);
}
