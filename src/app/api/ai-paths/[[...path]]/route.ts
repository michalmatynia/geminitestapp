export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

import * as dbAction from '../db-action/route-handler';
import * as health from '../health/route-handler';
import * as playwright from '../playwright/route-handler';
import * as playwrightRun from '../playwright/[runId]/route-handler';
import * as playwrightArtifact from '../playwright/[runId]/artifacts/[file]/route-handler';
import * as portableEngineRemediationDeadLetters from '../portable-engine/remediation-dead-letters/route-handler';
import * as portableEngineRemediationDeadLettersReplay from '../portable-engine/remediation-dead-letters/replay-history/route-handler';
import * as portableEngineRemediationWebhook from '../portable-engine/remediation-webhook/route-handler';
import * as portableEngineSchema from '../portable-engine/schema/route-handler';
import * as portableEngineSchemaDiff from '../portable-engine/schema/diff/route-handler';
import * as portableEngineTrendSnapshots from '../portable-engine/trend-snapshots/route-handler';
import * as runsIndex from '../runs/route-handler';
import * as runsQueueStatus from '../runs/queue-status/route-handler';
import * as runsEnqueue from '../runs/enqueue/route-handler';
import * as runsDeadLetterRequeue from '../runs/dead-letter/requeue/route-handler';
import * as runById from '../runs/[runId]/route-handler';
import * as runStream from '../runs/[runId]/stream/route-handler';
import * as runCancel from '../runs/[runId]/cancel/route-handler';
import * as runResume from '../runs/[runId]/resume/route-handler';
import * as runRetryNode from '../runs/[runId]/retry-node/route-handler';
import * as runtimeAnalyticsSummary from '../runtime-analytics/summary/route-handler';
import * as runtimeAnalyticsInsights from '../runtime-analytics/insights/route-handler';
import * as settings from '../settings/route-handler';
import * as settingsMaintenance from '../settings/maintenance/route-handler';
import * as triggerButtons from '../trigger-buttons/route-handler';
import * as triggerButtonsCleanup from '../trigger-buttons/cleanup-fixtures/route-handler';
import * as triggerButtonsReorder from '../trigger-buttons/reorder/route-handler';
import * as triggerButtonsById from '../trigger-buttons/[id]/route-handler';
import * as update from '../update/route-handler';
import * as validationDocsSnapshot from '../validation/docs-snapshot/route-handler';

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
  const basePath = '/api/ai-paths';
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith(basePath)) {
    return [];
  }
  const remainder = pathname.slice(basePath.length).replace(/^\/+/, '');
  return remainder ? remainder.split('/').filter(Boolean) : [];
};

const routeAiPaths = (
  method: HttpMethod,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const source = `ai-paths.[[...path]].${method}`;
  if (segments.length === 0) {
    return notFound(request, source);
  }

  const [first, second, third, fourth] = segments;

  if (first === 'health' && segments.length === 1) {
    return dispatch(health, method, request, undefined, source);
  }

  if (first === 'db-action' && segments.length === 1) {
    return dispatch(dbAction, method, request, undefined, source);
  }

  if (first === 'update' && segments.length === 1) {
    return dispatch(update, method, request, undefined, source);
  }

  if (first === 'settings') {
    if (segments.length === 1) {
      return dispatch(settings, method, request, undefined, source);
    }
    if (second === 'maintenance' && segments.length === 2) {
      return dispatch(settingsMaintenance, method, request, undefined, source);
    }
    return notFound(request, source);
  }

  if (first === 'runs') {
    if (second === 'queue-status' && segments.length === 2) {
      return dispatch(runsQueueStatus, method, request, undefined, source);
    }
    if (second === 'enqueue' && segments.length === 2) {
      return dispatch(runsEnqueue, method, request, undefined, source);
    }
    if (second === 'dead-letter' && third === 'requeue' && segments.length === 3) {
      return dispatch(runsDeadLetterRequeue, method, request, undefined, source);
    }
    if (second && third === 'stream' && segments.length === 3) {
      return dispatch(runStream, method, request, { runId: second }, source);
    }
    if (second && third === 'cancel' && segments.length === 3) {
      return dispatch(runCancel, method, request, { runId: second }, source);
    }
    if (second && third === 'resume' && segments.length === 3) {
      return dispatch(runResume, method, request, { runId: second }, source);
    }
    if (second && third === 'retry-node' && segments.length === 3) {
      return dispatch(runRetryNode, method, request, { runId: second }, source);
    }
    if (segments.length === 1) {
      return dispatch(runsIndex, method, request, undefined, source);
    }
    if (second && segments.length === 2) {
      return dispatch(runById, method, request, { runId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'runtime-analytics') {
    if (second === 'summary' && segments.length === 2) {
      return dispatch(runtimeAnalyticsSummary, method, request, undefined, source);
    }
    if (second === 'insights' && segments.length === 2) {
      return dispatch(runtimeAnalyticsInsights, method, request, undefined, source);
    }
    return notFound(request, source);
  }

  if (first === 'trigger-buttons') {
    if (second === 'cleanup-fixtures' && segments.length === 2) {
      return dispatch(triggerButtonsCleanup, method, request, undefined, source);
    }
    if (second === 'reorder' && segments.length === 2) {
      return dispatch(triggerButtonsReorder, method, request, undefined, source);
    }
    if (segments.length === 1) {
      return dispatch(triggerButtons, method, request, undefined, source);
    }
    if (second && segments.length === 2) {
      return dispatch(triggerButtonsById, method, request, { id: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'validation' && second === 'docs-snapshot' && segments.length === 2) {
    return dispatch(validationDocsSnapshot, method, request, undefined, source);
  }

  if (first === 'playwright') {
    if (second && third === 'artifacts' && fourth && segments.length === 4) {
      return dispatch(playwrightArtifact, method, request, { runId: second, file: fourth }, source);
    }
    if (second && segments.length === 2) {
      return dispatch(playwrightRun, method, request, { runId: second }, source);
    }
    if (segments.length === 1) {
      return dispatch(playwright, method, request, undefined, source);
    }
    return notFound(request, source);
  }

  if (first === 'portable-engine') {
    if (second === 'schema' && third === 'diff' && segments.length === 3) {
      return dispatch(portableEngineSchemaDiff, method, request, undefined, source);
    }
    if (second === 'schema' && segments.length === 2) {
      return dispatch(portableEngineSchema, method, request, undefined, source);
    }
    if (second === 'trend-snapshots' && segments.length === 2) {
      return dispatch(portableEngineTrendSnapshots, method, request, undefined, source);
    }
    if (second === 'remediation-dead-letters' && third === 'replay-history' && segments.length === 3) {
      return dispatch(portableEngineRemediationDeadLettersReplay, method, request, undefined, source);
    }
    if (second === 'remediation-dead-letters' && segments.length === 2) {
      return dispatch(portableEngineRemediationDeadLetters, method, request, undefined, source);
    }
    if (second === 'remediation-webhook' && segments.length === 2) {
      return dispatch(portableEngineRemediationWebhook, method, request, undefined, source);
    }
    return notFound(request, source);
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
  (request: NextRequest, _ctx, _params) => routeAiPaths('GET', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'ai-paths.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeAiPaths('POST', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'ai-paths.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeAiPaths('PUT', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'ai-paths.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeAiPaths('PATCH', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'ai-paths.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) => routeAiPaths('DELETE', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'ai-paths.[[...path]].DELETE', requireAuth: true }
);
