import { NextRequest, NextResponse } from 'next/server';

import { kangurLearnerActivityUpdateInputSchema } from '@/shared/contracts/kangur';
import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  getKangurLearnerActivityHandler,
  postKangurLearnerActivityHandler,
} from '../handler';
import { GET_handler as getKangurLearnerActivityStreamHandler } from '../stream/handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { action?: string[] };

type RouteHandler = (request: NextRequest) => Promise<Response>;

const BASE_GET = apiHandler(getKangurLearnerActivityHandler, {
  source: 'kangur.learnerActivity.GET',
  service: 'kangur.api',
  successLogging: 'all',
});

const BASE_POST = apiHandler(postKangurLearnerActivityHandler, {
  source: 'kangur.learnerActivity.POST',
  service: 'kangur.api',
  successLogging: 'off',
  parseJsonBody: true,
  bodySchema: kangurLearnerActivityUpdateInputSchema,
});

const STREAM_GET = apiHandler(getKangurLearnerActivityStreamHandler, {
  source: 'kangur.learner-activity.stream.GET',
  requireAuth: true,
  successLogging: 'off',
});

const notFound = (): Response => NextResponse.json({ error: 'Not found.' }, { status: 404 });

const resolveAction = (params: RouteParams): string | null => {
  if (!params.action || params.action.length === 0) {
    return null;
  }
  return params.action[0]?.trim() || null;
};

export const GET = (req: NextRequest, ctx: { params: RouteParams }): Promise<Response> => {
  const action = resolveAction(ctx.params);
  if (!action) {
    return BASE_GET(req);
  }
  if (action === 'stream') {
    return STREAM_GET(req);
  }
  return Promise.resolve(notFound());
};

export const POST = (req: NextRequest, ctx: { params: RouteParams }): Promise<Response> => {
  const action = resolveAction(ctx.params);
  if (!action) {
    return BASE_POST(req);
  }
  return Promise.resolve(notFound());
};
