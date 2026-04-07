export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import {
  type CatchAllRouteMethod as HttpMethod,
  type CatchAllRoutePathParams as RouteParams,
  getPathSegments,
  handleCatchAllRequest,
} from '@/shared/lib/api/catch-all-router';

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

const ROUTES = [
  { pattern: [], module: chatbotIndex },
  { pattern: ['agent'], module: agentIndex },
  { pattern: ['agent', { param: 'runId' }, 'assets', { param: 'file' }], module: agentRunAssets },
  { pattern: ['agent', { param: 'runId' }, { param: 'action' }], module: agentRunAction },
  { pattern: ['agent', { param: 'runId' }], module: agentRun },
  { pattern: ['context'], module: context },
  { pattern: ['jobs'], module: jobsIndex },
  { pattern: ['jobs', { param: 'jobId' }], module: jobById },
  { pattern: ['memory'], module: memory },
  { pattern: ['sessions'], module: sessionsIndex },
  { pattern: ['sessions', { param: 'sessionId' }, 'messages'], module: sessionMessages },
  { pattern: ['sessions', { param: 'sessionId' }], module: sessionById },
  { pattern: ['settings'], module: settings },
];

const routeChatbot = (
  method: HttpMethod,
  request: NextRequest,
): Promise<Response> => handleCatchAllRequest(
  method,
  request,
  getPathSegments(request, '/api/chatbot'),
  ROUTES,
  'chatbot'
);

const ROUTER_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
} as const;

export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeChatbot('GET', request),
  { ...ROUTER_OPTIONS, source: 'chatbot.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeChatbot('POST', request),
  { ...ROUTER_OPTIONS, source: 'chatbot.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeChatbot('PUT', request),
  { ...ROUTER_OPTIONS, source: 'chatbot.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeChatbot('PATCH', request),
  { ...ROUTER_OPTIONS, source: 'chatbot.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeChatbot('DELETE', request),
  { ...ROUTER_OPTIONS, source: 'chatbot.[[...path]].DELETE', requireAuth: true }
);
