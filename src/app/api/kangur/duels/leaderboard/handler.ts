import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listKangurDuelLeaderboard } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { validationError } from '@/shared/errors/app-error';
import { optionalIntegerQuerySchema } from '@/shared/lib/api/query-schema';

const querySchema = z.object({
  limit: optionalIntegerQuerySchema(z.number().int()),
  lookbackDays: optionalIntegerQuerySchema(z.number().int()),
});

export async function getKangurDuelLeaderboardHandler(
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
  const { limit, lookbackDays } = parsedQuery.data;
  const response = await listKangurDuelLeaderboard({
    ...(typeof limit === 'number' ? { limit } : {}),
    ...(typeof lookbackDays === 'number' ? { lookbackDays } : {}),
  });

  void logKangurServerEvent({
    source: 'kangur.duels.leaderboard',
    message: 'Kangur duel leaderboard requested',
    request: req,
    requestContext: ctx,
    actor: null,
    statusCode: 200,
    context: {
      limit: limit ?? null,
      lookbackDays: lookbackDays ?? null,
      entries: response.entries.length,
    },
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
