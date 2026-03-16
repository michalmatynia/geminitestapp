export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

import {
  kangurLessonTtsProbeRequestSchema,
  kangurLessonTtsRequestSchema,
  kangurLessonTtsStatusRequestSchema,
} from '@/features/kangur/tts/contracts';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurTtsHandler } from '../handler';
import { postKangurTtsProbeHandler } from '../probe/handler';
import { postKangurTtsStatusHandler } from '../status/handler';

type RouteContext = {
  params: {
    action?: string[];
  };
};

type SimpleRouteHandler = (request: NextRequest) => Promise<Response>;

const ROOT_ACTION = '';

const postHandlers: Record<string, SimpleRouteHandler> = {
  [ROOT_ACTION]: apiHandler(postKangurTtsHandler, {
    source: 'kangur.tts.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurLessonTtsRequestSchema,
  }),
  status: apiHandler(postKangurTtsStatusHandler, {
    source: 'kangur.tts.status.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurLessonTtsStatusRequestSchema,
  }),
  probe: apiHandler(postKangurTtsProbeHandler, {
    source: 'kangur.tts.probe.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurLessonTtsProbeRequestSchema,
  }),
};

const knownActions = new Set(Object.keys(postHandlers));

const notFound = (): Response => new Response('Not Found', { status: 404 });
const methodNotAllowed = (allowed: string[]): Response =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: allowed.join(', ') },
  });

const resolveAction = (
  raw: string[] | undefined
): { action: string; hasExtraSegments: boolean } => {
  if (!raw) {
    return { action: ROOT_ACTION, hasExtraSegments: false };
  }
  if (raw.length === 0) {
    return { action: ROOT_ACTION, hasExtraSegments: false };
  }
  return { action: raw[0] ?? ROOT_ACTION, hasExtraSegments: raw.length > 1 };
};

export const GET = (_request: NextRequest, context: RouteContext): Promise<Response> => {
  const { action, hasExtraSegments } = resolveAction(context.params.action);
  if (hasExtraSegments) {
    return Promise.resolve(notFound());
  }
  if (knownActions.has(action)) {
    return Promise.resolve(methodNotAllowed(['POST']));
  }
  return Promise.resolve(notFound());
};

export const POST = (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { action, hasExtraSegments } = resolveAction(context.params.action);
  if (hasExtraSegments) {
    return Promise.resolve(notFound());
  }
  const handler = postHandlers[action];
  if (!handler) {
    return Promise.resolve(notFound());
  }
  return handler(request);
};
