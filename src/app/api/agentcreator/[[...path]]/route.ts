
import { NextRequest } from 'next/server';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import {
  type CatchAllRouteMethod as HttpMethod,
  type CatchAllRoutePathParams as RouteParams,
  getPathSegments,
  handleCatchAllRequest,
  matchCatchAllPattern,
} from '@/shared/lib/api/catch-all-router';

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

const ROUTES = [
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

export const __testables = {
  ROUTES,
  matchPattern: matchCatchAllPattern,
};

const routeAgentCreator = (
  method: HttpMethod,
  request: NextRequest,
): Promise<Response> => handleCatchAllRequest(
  method,
  request,
  getPathSegments(request, '/api/agentcreator'),
  ROUTES,
  'agentcreator'
);

const ROUTER_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
} as const;

export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeAgentCreator('GET', request),
  { ...ROUTER_OPTIONS, source: 'agentcreator.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeAgentCreator('POST', request),
  { ...ROUTER_OPTIONS, source: 'agentcreator.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeAgentCreator('PUT', request),
  { ...ROUTER_OPTIONS, source: 'agentcreator.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeAgentCreator('PATCH', request),
  { ...ROUTER_OPTIONS, source: 'agentcreator.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeAgentCreator('DELETE', request),
  { ...ROUTER_OPTIONS, source: 'agentcreator.[[...path]].DELETE', requireAuth: true }
);
