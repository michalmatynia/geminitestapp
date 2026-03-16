import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createKangurDuelLobbyChatMessage,
  listKangurDuelLobbyChatMessages,
} from '@/features/kangur/duels/lobby-chat';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import {
  KANGUR_DUELS_LOBBY_CHAT_MAX_LIMIT,
  kangurDuelLobbyChatCreateInputSchema,
} from '@/shared/contracts/kangur-duels-chat';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError, validationError } from '@/shared/errors/app-error';
import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

const querySchema = z.object({
  limit: optionalIntegerQuerySchema(
    z.number().int().min(1).max(KANGUR_DUELS_LOBBY_CHAT_MAX_LIMIT)
  ),
  before: optionalTrimmedQueryString(),
});

export async function getKangurDuelLobbyChatHandler(
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
  const { limit, before } = parsedQuery.data;
  const actor = await resolveKangurActor(req);
  if (actor.actorType !== 'learner') {
    throw forbiddenError('Only learner accounts can access lobby chat.');
  }
  const learner = requireActiveLearner(actor);
  const response = await listKangurDuelLobbyChatMessages({
    ...(Number.isFinite(limit) ? { limit } : {}),
    ...(before ? { before } : {}),
  });

  void logKangurServerEvent({
    source: 'kangur.duels.lobby-chat',
    message: 'Kangur duel lobby chat requested',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      entries: response.messages.length,
      learnerId: learner.id,
      limit: Number.isFinite(limit) ? limit : null,
      before,
    },
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function postKangurDuelLobbyChatHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.actorType !== 'learner') {
    throw forbiddenError('Only learner accounts can access lobby chat.');
  }
  const learner = requireActiveLearner(actor);
  const payload = kangurDuelLobbyChatCreateInputSchema.parse(ctx.body);
  const response = await createKangurDuelLobbyChatMessage(learner, payload);

  void logKangurServerEvent({
    source: 'kangur.duels.lobby-chat',
    message: 'Kangur duel lobby chat message created',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 201,
    context: {
      messageId: response.message.id,
      messageLength: response.message.message.length,
    },
  });

  return NextResponse.json(response, { status: 201 });
}
