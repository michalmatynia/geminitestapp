export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { apiHandler } from '@/shared/lib/api/api-handler';

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
  if (segments.length === 0) {
    return Promise.resolve(notFound());
  }

  const [first, second, third, fourth, fifth] = segments;

  if (first === 'agent') {
    if (segments.length === 1) {
      return dispatch(agentIndex, method, request);
    }
    if (second === 'snapshots' && third && segments.length === 3) {
      return dispatch(agentSnapshotById, method, request, { snapshotId: third });
    }
    if (second && segments.length === 2) {
      return dispatch(agentRun, method, request, { runId: second });
    }
    if (second && third === 'assets' && fourth && segments.length === 4) {
      return dispatch(agentRunAssets, method, request, { runId: second, file: fourth });
    }
    if (second && third === 'audits' && segments.length === 3) {
      return dispatch(agentRunAudits, method, request, { runId: second });
    }
    if (second && third === 'controls' && segments.length === 3) {
      return dispatch(agentRunControls, method, request, { runId: second });
    }
    if (second && third === 'logs' && segments.length === 3) {
      return dispatch(agentRunLogs, method, request, { runId: second });
    }
    if (second && third === 'snapshots' && segments.length === 3) {
      return dispatch(agentRunSnapshots, method, request, { runId: second });
    }
    if (second && third === 'stream' && segments.length === 3) {
      return dispatch(agentRunStream, method, request, { runId: second });
    }
    return Promise.resolve(notFound());
  }

  if (first === 'personas') {
    if (second === 'avatar' && segments.length === 2) {
      return dispatch(personaAvatar, method, request);
    }
    if (second && third === 'memory' && segments.length === 3) {
      return dispatch(personaMemory, method, request, { personaId: second });
    }
    if (second && third === 'visuals' && segments.length === 3) {
      return dispatch(personaVisuals, method, request, { personaId: second });
    }
    return Promise.resolve(notFound());
  }

  if (first === 'teaching') {
    if (second === 'agents') {
      if (segments.length === 2) {
        return dispatch(teachingAgents, method, request);
      }
      if (third && segments.length === 3) {
        return dispatch(teachingAgentById, method, request, { agentId: third });
      }
      return Promise.resolve(notFound());
    }
    if (second === 'chat' && segments.length === 2) {
      return dispatch(teachingChat, method, request);
    }
    if (second === 'collections') {
      if (segments.length === 2) {
        return dispatch(teachingCollections, method, request);
      }
      if (third && fourth === 'documents') {
        if (segments.length === 4) {
          return dispatch(teachingCollectionDocuments, method, request, { collectionId: third });
        }
        if (fifth && segments.length === 5) {
          return dispatch(teachingCollectionDocumentById, method, request, {
            collectionId: third,
            documentId: fifth,
          });
        }
        return Promise.resolve(notFound());
      }
      if (third && fourth === 'search' && segments.length === 4) {
        return dispatch(teachingCollectionSearch, method, request, { collectionId: third });
      }
      if (third && segments.length === 3) {
        return dispatch(teachingCollectionById, method, request, { collectionId: third });
      }
      return Promise.resolve(notFound());
    }
  }

  return Promise.resolve(notFound());
};

const buildRouteHandler = (method: HttpMethod) =>
  apiHandler(
    async (request: NextRequest) => routeAgentCreator(method, request, getPathSegments(request)),
    {
      source: `agentcreator.router.${method}`,
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
