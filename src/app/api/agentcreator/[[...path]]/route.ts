export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

import * as agentIndex from '../agent/route-handler';
import * as agentSnapshotById from '../agent/snapshots/[snapshotId]/route-handler';
import * as agentRun from '../agent/[runId]/route-handler';
import * as agentRunAssets from '../agent/[runId]/assets/[file]/route-handler';
import * as agentRunAudits from '../agent/[runId]/audits/route-handler';
import * as agentRunControls from '../agent/[runId]/controls/route-handler';
import * as agentRunLogs from '../agent/[runId]/logs/route-handler';
import * as agentRunSnapshots from '../agent/[runId]/snapshots/route-handler';
import * as agentRunStream from '../agent/[runId]/stream/route-handler';
import * as personaAvatar from '../personas/avatar/route-handler';
import * as personaMemory from '../personas/[personaId]/memory/route-handler';
import * as personaVisuals from '../personas/[personaId]/visuals/route-handler';
import * as teachingAgents from '../teaching/agents/route-handler';
import * as teachingAgentById from '../teaching/agents/[agentId]/route-handler';
import * as teachingChat from '../teaching/chat/route-handler';
import * as teachingCollections from '../teaching/collections/route-handler';
import * as teachingCollectionById from '../teaching/collections/[collectionId]/route-handler';
import * as teachingCollectionDocuments from '../teaching/collections/[collectionId]/documents/route-handler';
import * as teachingCollectionDocumentById from '../teaching/collections/[collectionId]/documents/[documentId]/route-handler';
import * as teachingCollectionSearch from '../teaching/collections/[collectionId]/search/route-handler';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Params = Record<string, string>;
type RouteParams = { path?: string[] | string };
type RouteHandler<P extends Params = Params> = (
  request: NextRequest,
  context: { params: P | Promise<P> }
) => Promise<Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- route modules define their own param shapes.
type RouteModule = Partial<Record<HttpMethod, RouteHandler<any>>>;
type RoutePatternToken =
  | string
  | { param: string }
  | { literal: string; optional?: boolean };
type RoutePattern = RoutePatternToken[];
type RouteDefinition = { pattern: RoutePattern; module: RouteModule };

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const ROUTES: RouteDefinition[] = [
  { pattern: ['agent'], module: agentIndex },
  { pattern: ['agent', 'snapshots', { param: 'snapshotId' }], module: agentSnapshotById },
  { pattern: ['agent', { param: 'runId' }, 'assets', { param: 'file' }], module: agentRunAssets },
  { pattern: ['agent', { param: 'runId' }, 'audits'], module: agentRunAudits },
  { pattern: ['agent', { param: 'runId' }, 'controls'], module: agentRunControls },
  { pattern: ['agent', { param: 'runId' }, 'logs'], module: agentRunLogs },
  { pattern: ['agent', { param: 'runId' }, 'snapshots'], module: agentRunSnapshots },
  { pattern: ['agent', { param: 'runId' }, 'stream'], module: agentRunStream },
  { pattern: ['agent', { param: 'runId' }], module: agentRun },
  { pattern: ['personas', 'avatar'], module: personaAvatar },
  { pattern: ['personas', { param: 'personaId' }, 'memory'], module: personaMemory },
  { pattern: ['personas', { param: 'personaId' }, 'visuals'], module: personaVisuals },
  { pattern: ['teaching', 'agents'], module: teachingAgents },
  { pattern: ['teaching', 'agents', { param: 'agentId' }], module: teachingAgentById },
  { pattern: ['teaching', 'chat'], module: teachingChat },
  { pattern: ['teaching', 'collections'], module: teachingCollections },
  {
    pattern: ['teaching', 'collections', { param: 'collectionId' }, 'documents'],
    module: teachingCollectionDocuments,
  },
  {
    pattern: [
      'teaching',
      'collections',
      { param: 'collectionId' },
      'documents',
      { param: 'documentId' },
    ],
    module: teachingCollectionDocumentById,
  },
  {
    pattern: ['teaching', 'collections', { param: 'collectionId' }, 'search'],
    module: teachingCollectionSearch,
  },
  { pattern: ['teaching', 'collections', { param: 'collectionId' }], module: teachingCollectionById },
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
  const response = await createErrorResponse(
    methodNotAllowedError('Method not allowed', {
      allowedMethods: allowed,
    }),
    { request, source }
  );
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
