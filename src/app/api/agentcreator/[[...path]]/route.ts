export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';


type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Params = Record<string, string>;
type RouteParams = { path?: string[] | string };
type RouteHandler<P extends Params = Params> = (
  request: NextRequest,
  context: { params: P | Promise<P> }
) => Promise<Response>;
type RouteModule<P extends Params = Params> = Partial<Record<HttpMethod, RouteHandler<P>>>;
type RoutePatternToken =
  | string
  | { param: string }
  | { literal: string; optional?: boolean };
type RoutePattern = RoutePatternToken[];

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const ROUTES: Array<{ pattern: RoutePattern }> = [
  { pattern: ['agent', { param: 'runId' }, 'assets', { param: 'file' }] },
];

const matchPattern = (pattern: RoutePattern, segments: string[]): Params | null => {
  const params: Params = {};
  let index = 0;

  for (const token of pattern) {
    const segment = segments[index];

    if (typeof token === 'string') {
      if (segment !== token) {
        return null;
      }
      index += 1;
      continue;
    }

    if ('param' in token) {
      if (!segment) {
        return null;
      }
      params[token.param] = segment;
      index += 1;
      continue;
    }

    if ('literal' in token) {
      if (segment === token.literal) {
        index += 1;
        continue;
      }
      if (token.optional) {
        continue;
      }
      return null;
    }
  }

  if (index < segments.length) {
    return null;
  }

  return params;
};

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
  const basePath = '/api/agentcreator';
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith(basePath)) {
    return [];
  }
  const remainder = pathname.slice(basePath.length).replace(/^\/+/, '');
  return remainder ? remainder.split('/').filter(Boolean) : [];
};

const routeAgentCreator = (
  method: HttpMethod,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const source = `agentcreator.[[...path]].${method}`;
  if (segments.length === 0) {
    return notFound(request, source);
  }

  const [first, second, third, fourth, fifth] = segments;

  if (first === 'agent') {
    if (segments.length === 1) {
      return dispatch(() => import('../agent/route-handler'), method, request, undefined, source);
    }
    if (second === 'snapshots' && third && segments.length === 3) {
      return dispatch(() => import('../agent/snapshots/[snapshotId]/route-handler'), method, request, { snapshotId: third }, source);
    }
    if (second && segments.length === 2) {
      return dispatch(() => import('../agent/[runId]/route-handler'), method, request, { runId: second }, source);
    }
    if (second && third === 'assets' && fourth && segments.length === 4) {
      return dispatch(() => import('../agent/[runId]/assets/[file]/route-handler'), method, request, { runId: second, file: fourth }, source);
    }
    if (second && third === 'audits' && segments.length === 3) {
      return dispatch(() => import('../agent/[runId]/audits/route-handler'), method, request, { runId: second }, source);
    }
    if (second && third === 'controls' && segments.length === 3) {
      return dispatch(() => import('../agent/[runId]/controls/route-handler'), method, request, { runId: second }, source);
    }
    if (second && third === 'logs' && segments.length === 3) {
      return dispatch(() => import('../agent/[runId]/logs/route-handler'), method, request, { runId: second }, source);
    }
    if (second && third === 'snapshots' && segments.length === 3) {
      return dispatch(() => import('../agent/[runId]/snapshots/route-handler'), method, request, { runId: second }, source);
    }
    if (second && third === 'stream' && segments.length === 3) {
      return dispatch(() => import('../agent/[runId]/stream/route-handler'), method, request, { runId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'personas') {
    if (second === 'avatar' && segments.length === 2) {
      return dispatch(() => import('../personas/avatar/route-handler'), method, request, undefined, source);
    }
    if (second && third === 'memory' && segments.length === 3) {
      return dispatch(() => import('../personas/[personaId]/memory/route-handler'), method, request, { personaId: second }, source);
    }
    if (second && third === 'visuals' && segments.length === 3) {
      return dispatch(() => import('../personas/[personaId]/visuals/route-handler'), method, request, { personaId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'teaching') {
    if (second === 'agents') {
      if (segments.length === 2) {
        return dispatch(() => import('../teaching/agents/route-handler'), method, request, undefined, source);
      }
      if (third && segments.length === 3) {
        return dispatch(() => import('../teaching/agents/[agentId]/route-handler'), method, request, { agentId: third }, source);
      }
      return notFound(request, source);
    }
    if (second === 'chat' && segments.length === 2) {
      return dispatch(() => import('../teaching/chat/route-handler'), method, request, undefined, source);
    }
    if (second === 'collections') {
      if (segments.length === 2) {
        return dispatch(() => import('../teaching/collections/route-handler'), method, request, undefined, source);
      }
      if (third && fourth === 'documents') {
        if (segments.length === 4) {
          return dispatch(() => import('../teaching/collections/[collectionId]/documents/route-handler'), method, request, { collectionId: third }, source);
        }
        if (fifth && segments.length === 5) {
          return dispatch(
            teachingCollectionDocumentById,
            method,
            request,
            { collectionId: third, documentId: fifth },
            source
          );
        }
        return notFound(request, source);
      }
      if (third && fourth === 'search' && segments.length === 4) {
        return dispatch(() => import('../teaching/collections/[collectionId]/search/route-handler'), method, request, { collectionId: third }, source);
      }
      if (third && segments.length === 3) {
        return dispatch(() => import('../teaching/collections/[collectionId]/route-handler'), method, request, { collectionId: third }, source);
      }
      return notFound(request, source);
    }
  }

  return notFound(request, source);
};

const ROUTER_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
} as const;

export const __testables = {
  ROUTES,
  matchPattern,
};

export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeAgentCreator('GET', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'agentcreator.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeAgentCreator('POST', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'agentcreator.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeAgentCreator('PUT', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'agentcreator.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeAgentCreator('PATCH', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'agentcreator.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeAgentCreator('DELETE', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'agentcreator.[[...path]].DELETE', requireAuth: true }
);
