import { NextRequest, NextResponse } from 'next/server';

import { kangurKnowledgeGraphSyncRequestSchema } from '@/shared/contracts';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, querySchema } from '../status/handler';
import { POST_handler } from '../sync/handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { action: string };

type RouteHandler = (request: NextRequest) => Promise<Response>;

const GET_HANDLERS: Record<string, RouteHandler> = {
  status: apiHandler(GET_handler, {
    source: 'kangur.knowledgeGraph.status.GET',
    resolveSessionUser: false,
    querySchema,
  }),
};

const POST_HANDLERS: Record<string, RouteHandler> = {
  sync: apiHandler(POST_handler, {
    source: 'kangur.knowledgeGraph.sync.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurKnowledgeGraphSyncRequestSchema,
    requireAuth: true,
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
