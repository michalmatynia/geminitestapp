import { NextRequest, NextResponse } from 'next/server';

import {
  numberBalanceMatchCreateInputSchema,
  numberBalanceMatchJoinInputSchema,
  numberBalanceMatchStateInputSchema,
  numberBalanceSolveAttemptSchema,
} from '@/shared/contracts/kangur-multiplayer-number-balance';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postNumberBalanceCreateHandler } from '../create/handler';
import { postNumberBalanceJoinHandler } from '../join/handler';
import { postNumberBalanceSolveHandler } from '../solve/handler';
import { postNumberBalanceStateHandler } from '../state/handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { action: string };

type RouteHandler = (request: NextRequest) => Promise<Response>;

const POST_HANDLERS: Record<string, RouteHandler> = {
  create: apiHandler(postNumberBalanceCreateHandler, {
    source: 'kangur.number-balance.create.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: numberBalanceMatchCreateInputSchema,
  }),
  join: apiHandler(postNumberBalanceJoinHandler, {
    source: 'kangur.number-balance.join.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: numberBalanceMatchJoinInputSchema,
  }),
  solve: apiHandler(postNumberBalanceSolveHandler, {
    source: 'kangur.number-balance.solve.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: numberBalanceSolveAttemptSchema,
  }),
  state: apiHandler(postNumberBalanceStateHandler, {
    source: 'kangur.number-balance.state.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: numberBalanceMatchStateInputSchema,
  }),
};

const notFound = (): Response => NextResponse.json({ error: 'Not found.' }, { status: 404 });

export const POST = (req: NextRequest, ctx: { params: RouteParams }): Promise<Response> => {
  const action = ctx.params.action?.trim();
  const handler = action ? POST_HANDLERS[action] : undefined;
  if (!handler) {
    return Promise.resolve(notFound());
  }
  return handler(req);
};
