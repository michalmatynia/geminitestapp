export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

import * as agentIndex from '../agent/route-handler';
import * as agentRun from '../agent/[runId]/route-handler';
import * as agentRunAssets from '../agent/[runId]/assets/[file]/route-handler';
import * as agentRunAudits from '../agent/[runId]/audits/route-handler';
import * as agentRunControls from '../agent/[runId]/controls/route-handler';
import * as agentRunLogs from '../agent/[runId]/logs/route-handler';
import * as agentRunSnapshots from '../agent/[runId]/snapshots/route-handler';
import * as agentRunStream from '../agent/[runId]/stream/route-handler';
import * as agentSnapshotById from '../agent/snapshots/[snapshotId]/route-handler';
import * as personaAvatar from '../personas/avatar/route-handler';
import * as personaMemory from '../personas/[personaId]/memory/route-handler';
import * as personaVisuals from '../personas/[personaId]/visuals/route-handler';
import * as teachingAgents from '../teaching/agents/route-handler';
import * as teachingAgentById from '../teaching/agents/[agentId]/route-handler';
import * as teachingChat from '../teaching/chat/route-handler';
import * as teachingCollections from '../teaching/collections/route-handler';
import * as teachingCollectionById from '../teaching/collections/[collectionId]/route-handler';
import * as teachingCollectionSearch from '../teaching/collections/[collectionId]/search/route-handler';
import * as teachingCollectionDocuments from '../teaching/collections/[collectionId]/documents/route-handler';
import * as teachingCollectionDocumentById from '../teaching/collections/[collectionId]/documents/[documentId]/route-handler';

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
      return dispatch(agentIndex, method, request, undefined, source);
    }
    if (second === 'snapshots' && third && segments.length === 3) {
      return dispatch(agentSnapshotById, method, request, { snapshotId: third }, source);
    }
    if (second && segments.length === 2) {
      return dispatch(agentRun, method, request, { runId: second }, source);
    }
    if (second && third === 'assets' && fourth && segments.length === 4) {
      return dispatch(agentRunAssets, method, request, { runId: second, file: fourth }, source);
    }
    if (second && third === 'audits' && segments.length === 3) {
      return dispatch(agentRunAudits, method, request, { runId: second }, source);
    }
    if (second && third === 'controls' && segments.length === 3) {
      return dispatch(agentRunControls, method, request, { runId: second }, source);
    }
    if (second && third === 'logs' && segments.length === 3) {
      return dispatch(agentRunLogs, method, request, { runId: second }, source);
    }
    if (second && third === 'snapshots' && segments.length === 3) {
      return dispatch(agentRunSnapshots, method, request, { runId: second }, source);
    }
    if (second && third === 'stream' && segments.length === 3) {
      return dispatch(agentRunStream, method, request, { runId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'personas') {
    if (second === 'avatar' && segments.length === 2) {
      return dispatch(personaAvatar, method, request, undefined, source);
    }
    if (second && third === 'memory' && segments.length === 3) {
      return dispatch(personaMemory, method, request, { personaId: second }, source);
    }
    if (second && third === 'visuals' && segments.length === 3) {
      return dispatch(personaVisuals, method, request, { personaId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'teaching') {
    if (second === 'agents') {
      if (segments.length === 2) {
        return dispatch(teachingAgents, method, request, undefined, source);
      }
      if (third && segments.length === 3) {
        return dispatch(teachingAgentById, method, request, { agentId: third }, source);
      }
      return notFound(request, source);
    }
    if (second === 'chat' && segments.length === 2) {
      return dispatch(teachingChat, method, request, undefined, source);
    }
    if (second === 'collections') {
      if (segments.length === 2) {
        return dispatch(teachingCollections, method, request, undefined, source);
      }
      if (third && fourth === 'documents') {
        if (segments.length === 4) {
          return dispatch(teachingCollectionDocuments, method, request, { collectionId: third }, source);
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
        return dispatch(teachingCollectionSearch, method, request, { collectionId: third }, source);
      }
      if (third && segments.length === 3) {
        return dispatch(teachingCollectionById, method, request, { collectionId: third }, source);
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
