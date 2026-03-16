export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { apiHandler } from '@/shared/lib/api/api-handler';

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
type RouteHandler<P extends Params = Params> = (
  request: NextRequest,
  context: { params: P | Promise<P> }
) => Promise<Response>;
type RouteModule<P extends Params = Params> = Partial<Record<HttpMethod, RouteHandler<P>>>;

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const notFound = (): Response => new Response('Not Found', { status: 404 });
const methodNotAllowed = (allowed: HttpMethod[]): Response =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: allowed.join(', ') },
  });

const getAllowedMethods = <P extends Params>(module: RouteModule<P>): HttpMethod[] =>
  HTTP_METHODS.filter((method) => typeof module[method] === 'function');

const dispatch = <P extends Params>(
  module: RouteModule<P>,
  method: HttpMethod,
  request: NextRequest,
  params?: P
): Promise<Response> => {
  const handler = module[method];
  if (!handler) {
    const allowed = getAllowedMethods(module);
    return Promise.resolve(allowed.length > 0 ? methodNotAllowed(allowed) : notFound());
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
  if (segments.length === 0) {
    return dispatch(chatbotIndex, method, request);
  }

  const [first, second, third, fourth] = segments;

  if (first === 'agent') {
    if (segments.length === 1) {
      return dispatch(agentIndex, method, request);
    }
    if (second && third === 'assets' && fourth && segments.length === 4) {
      return dispatch(agentRunAssets, method, request, { runId: second, file: fourth });
    }
    if (second && third && segments.length === 3) {
      return dispatch(agentRunAction, method, request, { runId: second, action: third });
    }
    if (second && segments.length === 2) {
      return dispatch(agentRun, method, request, { runId: second });
    }
    return Promise.resolve(notFound());
  }

  if (first === 'context' && segments.length === 1) {
    return dispatch(context, method, request);
  }

  if (first === 'jobs') {
    if (segments.length === 1) {
      return dispatch(jobsIndex, method, request);
    }
    if (second && segments.length === 2) {
      return dispatch(jobById, method, request, { jobId: second });
    }
    return Promise.resolve(notFound());
  }

  if (first === 'memory' && segments.length === 1) {
    return dispatch(memory, method, request);
  }

  if (first === 'sessions') {
    if (segments.length === 1) {
      return dispatch(sessionsIndex, method, request);
    }
    if (second && third === 'messages' && segments.length === 3) {
      return dispatch(sessionMessages, method, request, { sessionId: second });
    }
    if (second && segments.length === 2) {
      return dispatch(sessionById, method, request, { sessionId: second });
    }
    return Promise.resolve(notFound());
  }

  if (first === 'settings' && segments.length === 1) {
    return dispatch(settings, method, request);
  }

  return Promise.resolve(notFound());
};

const buildRouteHandler = (method: HttpMethod) =>
  apiHandler(
    async (request: NextRequest) => routeChatbot(method, request, getPathSegments(request)),
    {
      source: `chatbot.router.${method}`,
      successLogging: 'off',
      requireCsrf: false,
      resolveSessionUser: false,
      rateLimitKey: false,
    }
  );

export const GET = buildRouteHandler('GET');
export const POST = buildRouteHandler('POST');
export const PUT = buildRouteHandler('PUT');
export const PATCH = buildRouteHandler('PATCH');
export const DELETE = buildRouteHandler('DELETE');
