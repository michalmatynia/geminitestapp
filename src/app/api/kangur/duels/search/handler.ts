import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { searchKangurDuelLearners } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { validationError } from '@/shared/errors/app-error';
import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

const querySchema = z.object({
  q: optionalTrimmedQueryString(),
  limit: optionalIntegerQuerySchema(z.number().int()),
});

export async function getKangurDuelSearchHandler(
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
  const query = parsedQuery.data.q ?? '';
  const { limit } = parsedQuery.data;
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const response = await searchKangurDuelLearners(learner, query, {
    ...(Number.isFinite(limit) ? { limit } : {}),
  });

  void logKangurServerEvent({
    source: 'kangur.duels.search',
    message: 'Kangur duel search requested',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      entries: response.entries.length,
      queryLength: query.length,
    },
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
