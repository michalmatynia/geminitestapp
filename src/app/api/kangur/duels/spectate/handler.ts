import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getKangurDuelSpectatorState } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { validationError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

const querySchema = z.object({
  sessionId: z.string().trim().min(1, 'Session id is required'),
  spectatorId: optionalTrimmedQueryString(),
});

export async function getKangurDuelSpectateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  if (!parsedQuery.success) {
    throw validationError('Invalid query parameters', {
      issues: parsedQuery.error.flatten(),
    });
  }
  const { sessionId } = parsedQuery.data;
  const spectatorId = parsedQuery.data.spectatorId ?? null;
  const response = await getKangurDuelSpectatorState(sessionId, { spectatorId });

  void logKangurServerEvent({
    source: 'kangur.duels.spectate',
    message: 'Kangur duel spectator state requested',
    request: req,
    requestContext: ctx,
    actor: null,
    statusCode: 200,
    context: {
      sessionId,
      status: response.session.status,
      spectatorId: spectatorId ?? null,
    },
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
