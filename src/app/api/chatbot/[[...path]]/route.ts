export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

import * as chatbotIndex from '../route-handler';
import * as agentIndex from '../agent/route-handler';
import * as agentRun from '../agent/[runId]/route-handler';
import * as agentRunAction from '../agent/[runId]/[action]/route-handler';
import * as agentRunAssets from '../agent/[runId]/assets/[file]/route-handler';
import * as context from '../context/route-handler';
import * as jobsIndex from '../jobs/route-handler';
import * as jobById from '../jobs/[jobId]/route-handler';
import * as memory from '../memory/route-handler';
import * as sessionsIndex from '../sessions/route-handler';
import * as sessionById from '../sessions/[sessionId]/route-handler';
import * as sessionMessages from '../sessions/[sessionId]/messages/route-handler';
import * as settings from '../settings/route-handler';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Params = Record<string, string>;
type RouteParams = { path?: string[] | string };
type RouteHandler<P extends Params = Params> = (
  request: NextRequest,
  context: { params: P | Promise<P> }
) => Promise<Response>;
type RouteModule<P extends Params = Params> = Partial<Record<HttpMethod, RouteHandler<P>>>;

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const notFound = async (request: NextRequest, source: string): Promise<Response> =>
  createErrorResponse(notFoundError('Not Found'), { request, source });
const methodNotAllowed = async (
  request: NextRequest,
  allowed: HttpMethod[],
  source: string
): Promise<Response> => {
  const response = await createErrorResponse(methodNotAllowedError('Method not allowed', {
    allowedMethods: allowed,
  }), { request, source });
  response.headers.set('Allow', allowed.join(', '));
  return response;
};

const getAllowedMethods = <P extends Params>(module: RouteModule<P>): HttpMethod[] =>
  HTTP_METHODS.filter((method) => typeof module[method] === 'function');

const dispatch = async <P extends Params>(
  module: RouteModule<P>,
  method: HttpMethod,
  request: NextRequest,
  params: P | undefined,
  source: string
): Promise<Response> => {
  const handler = module[method];
  if (!handler) {
    const allowed = getAllowedMethods(module);
    return allowed.length > 0
      ? methodNotAllowed(request, allowed, source)
      : notFound(request, source);
  }
  return handler(request, { params: Promise.resolve(params ?? ({} as P)) });
};

const getPathSegments = (request: NextRequest): string[] => {
  const basePath = '/api/chatbot';
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith(basePath)) {
    return [];
  }
  const remainder = pathname.slice(basePath.length).replace(/^\/+/, '');
  return remainder ? remainder.split('/').filter(Boolean) : [];
};

const routeChatbot = (
  method: HttpMethod,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const source = `chatbot.[[...path]].${method}`;
  if (segments.length === 0) {
    return dispatch(chatbotIndex, method, request, undefined, source);
  }

  const [first, second, third, fourth] = segments;

  if (first === 'agent') {
    if (segments.length === 1) {
      return dispatch(agentIndex, method, request, undefined, source);
    }
    if (second && third === 'assets' && fourth && segments.length === 4) {
      return dispatch(agentRunAssets, method, request, { runId: second, file: fourth }, source);
    }
    if (second && third && segments.length === 3) {
      return dispatch(agentRunAction, method, request, { runId: second, action: third }, source);
    }
    if (second && segments.length === 2) {
      return dispatch(agentRun, method, request, { runId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'context' && segments.length === 1) {
    return dispatch(context, method, request, undefined, source);
  }

  if (first === 'jobs') {
    if (segments.length === 1) {
      return dispatch(jobsIndex, method, request, undefined, source);
    }
    if (second && segments.length === 2) {
      return dispatch(jobById, method, request, { jobId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'memory' && segments.length === 1) {
    return dispatch(memory, method, request, undefined, source);
  }

  if (first === 'sessions') {
    if (segments.length === 1) {
      return dispatch(sessionsIndex, method, request, undefined, source);
    }
    if (second && third === 'messages' && segments.length === 3) {
      return dispatch(sessionMessages, method, request, { sessionId: second }, source);
    }
    if (second && segments.length === 2) {
      return dispatch(sessionById, method, request, { sessionId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'settings' && segments.length === 1) {
    return dispatch(settings, method, request, undefined, source);
  }

  return notFound(request, source);
};

const ROUTER_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
} as const;

export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeChatbot('GET', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'chatbot.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeChatbot('POST', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'chatbot.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeChatbot('PUT', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'chatbot.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeChatbot('PATCH', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'chatbot.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeChatbot('DELETE', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'chatbot.[[...path]].DELETE', requireAuth: true }
);
