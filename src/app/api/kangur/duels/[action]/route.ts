import { NextRequest, NextResponse } from 'next/server';

import {
  kangurDuelAnswerInputSchema,
  kangurDuelCreateInputSchema,
  kangurDuelJoinInputSchema,
  kangurDuelLeaveInputSchema,
} from '@/shared/contracts/kangur-duels';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurDuelAnswerHandler } from '../answer/handler';
import { postKangurDuelCreateHandler } from '../create/handler';
import { postKangurDuelJoinHandler } from '../join/handler';
import { postKangurDuelLeaveHandler } from '../leave/handler';
import { getKangurDuelLobbyHandler } from '../lobby/handler';
import { getKangurDuelOpponentsHandler } from '../opponents/handler';
import { getKangurDuelSearchHandler } from '../search/handler';
import { getKangurDuelStateHandler } from '../state/handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { action: string };

type RouteHandler = (request: NextRequest) => Promise<Response>;

const GET_HANDLERS: Record<string, RouteHandler> = {
  lobby: apiHandler(getKangurDuelLobbyHandler, {
    source: 'kangur.duels.lobby.GET',
    service: 'kangur.api',
  }),
  opponents: apiHandler(getKangurDuelOpponentsHandler, {
    source: 'kangur.duels.opponents.GET',
    service: 'kangur.api',
  }),
  search: apiHandler(getKangurDuelSearchHandler, {
    source: 'kangur.duels.search.GET',
    service: 'kangur.api',
  }),
  state: apiHandler(getKangurDuelStateHandler, {
    source: 'kangur.duels.state.GET',
    service: 'kangur.api',
    successLogging: 'all',
  }),
};

const POST_HANDLERS: Record<string, RouteHandler> = {
  answer: apiHandler(postKangurDuelAnswerHandler, {
    source: 'kangur.duels.answer.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurDuelAnswerInputSchema,
  }),
  create: apiHandler(postKangurDuelCreateHandler, {
    source: 'kangur.duels.create.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurDuelCreateInputSchema,
  }),
  join: apiHandler(postKangurDuelJoinHandler, {
    source: 'kangur.duels.join.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurDuelJoinInputSchema,
  }),
  leave: apiHandler(postKangurDuelLeaveHandler, {
    source: 'kangur.duels.leave.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurDuelLeaveInputSchema,
  }),
};

const notFound = (): Response => NextResponse.json({ error: 'Not found.' }, { status: 404 });

export const GET = (req: NextRequest, ctx: { params: RouteParams }): Promise<Response> => {
  const action = ctx.params.action?.trim();
  const handler = action ? GET_HANDLERS[action] : undefined;
  if (!handler) {
    return Promise.resolve(notFound());
  }
  return handler(req);
};

export const POST = (req: NextRequest, ctx: { params: RouteParams }): Promise<Response> => {
  const action = ctx.params.action?.trim();
  const handler = action ? POST_HANDLERS[action] : undefined;
  if (!handler) {
    return Promise.resolve(notFound());
  }
  return handler(req);
};
