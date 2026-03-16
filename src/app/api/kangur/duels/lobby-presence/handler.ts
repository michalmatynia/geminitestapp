import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  listKangurDuelLobbyPresence,
  recordKangurDuelLobbyPresence,
} from '@/features/kangur/duels/lobby-presence';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import {
  KANGUR_DUELS_LOBBY_PRESENCE_MAX_LIMIT,
} from '@/shared/contracts/kangur-duels';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { validationError } from '@/shared/errors/app-error';
import { optionalIntegerQuerySchema } from '@/shared/lib/api/query-schema';

const querySchema = z.object({
  limit: optionalIntegerQuerySchema(
    z.number().int().min(1).max(KANGUR_DUELS_LOBBY_PRESENCE_MAX_LIMIT)
  ),
});

export async function getKangurDuelLobbyPresenceHandler(
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
  const { limit } = parsedQuery.data;
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const response = await listKangurDuelLobbyPresence({
    ...(Number.isFinite(limit) ? { limit } : {}),
  });

  void logKangurServerEvent({
    source: 'kangur.duels.lobby-presence',
    message: 'Kangur duel lobby presence requested',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      entries: response.entries.length,
      learnerId: learner.id,
      limit: Number.isFinite(limit) ? limit : null,
    },
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function postKangurDuelLobbyPresenceHandler(
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
  const { limit } = parsedQuery.data;
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const response = await recordKangurDuelLobbyPresence(learner, {
    ...(Number.isFinite(limit) ? { limit } : {}),
  });

  void logKangurServerEvent({
    source: 'kangur.duels.lobby-presence',
    message: 'Kangur duel lobby presence updated',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      learnerId: learner.id,
      entries: response.entries.length,
    },
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
