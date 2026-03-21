export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type {
  CatchAllRouteDefinition as RouteDefinition,
  CatchAllRouteHandler as RouteHandler,
  CatchAllRouteMethod as HttpMethod,
  CatchAllRouteModule as RouteModule,
  CatchAllRouteParams as Params,
  CatchAllRoutePathParams as RouteParams,
  CatchAllRoutePatternToken as PatternToken,
} from '@/shared/lib/api/catch-all-route-types';
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

const getAllowedMethods = (module: RouteModule): HttpMethod[] =>
  HTTP_METHODS.filter((method) => typeof module[method] === 'function');

const dispatch = async (
  module: RouteModule,
  method: HttpMethod,
  request: NextRequest,
  params: Params | undefined,
  source: string
): Promise<Response> => {
  const handler = module[method];
  if (!handler) {
    const allowed = getAllowedMethods(module);
    return allowed.length > 0
      ? methodNotAllowed(request, allowed, source)
      : notFound(request, source);
  }
  return handler(request, { params: Promise.resolve(params ?? ({} as Params)) });
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

const param = (name: string): PatternToken => ({ param: name });

const matchPattern = (pattern: PatternToken[], segments: string[]): Params | null => {
  if (pattern.length !== segments.length) {
    return null;
  }
  const params: Params = {};
  for (let index = 0; index < pattern.length; index += 1) {
    const token = pattern[index];
    if (!token) {
      return null;
    }
    const segment = segments[index];
    if (!segment) {
      return null;
    }
    if (typeof token === 'string') {
      if (token !== segment) {
        return null;
      }
      continue;
    }
    params[token.param] = segment;
  }
  return params;
};

const ROUTES: RouteDefinition[] = [
  { pattern: [], module: chatbotIndex },
  { pattern: ['agent'], module: agentIndex },
  { pattern: ['agent', param('runId'), 'assets', param('file')], module: agentRunAssets },
  { pattern: ['agent', param('runId'), param('action')], module: agentRunAction },
  { pattern: ['agent', param('runId')], module: agentRun },
  { pattern: ['context'], module: context },
  { pattern: ['jobs'], module: jobsIndex },
  { pattern: ['jobs', param('jobId')], module: jobById },
  { pattern: ['memory'], module: memory },
  { pattern: ['sessions'], module: sessionsIndex },
  { pattern: ['sessions', param('sessionId'), 'messages'], module: sessionMessages },
  { pattern: ['sessions', param('sessionId')], module: sessionById },
  { pattern: ['settings'], module: settings },
];

const routeChatbot = (
  method: HttpMethod,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const source = `chatbot.[[...path]].${method}`;
  for (const route of ROUTES) {
    const params = matchPattern(route.pattern, segments);
    if (!params) {
      continue;
    }
    return dispatch(route.module, method, request, params, source);
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
