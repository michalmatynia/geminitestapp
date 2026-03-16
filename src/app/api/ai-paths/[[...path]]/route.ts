export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { apiHandler } from '@/shared/lib/api/api-handler';

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
type RouteHandler = (
  request: NextRequest,
  context: { params: Params | Promise<Params> }
) => Promise<Response>;
type RouteModule = Partial<Record<HttpMethod, RouteHandler>>;

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const notFound = (): Response => new Response('Not Found', { status: 404 });
const methodNotAllowed = (allowed: HttpMethod[]): Response =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: allowed.join(', ') },
  });

const getAllowedMethods = (module: RouteModule): HttpMethod[] =>
  HTTP_METHODS.filter((method) => typeof module[method] === 'function');

const dispatch = (
  module: RouteModule,
  method: HttpMethod,
  request: NextRequest,
  params?: Params
): Promise<Response> => {
  const handler = module[method];
  if (!handler) {
    const allowed = getAllowedMethods(module);
    return Promise.resolve(allowed.length > 0 ? methodNotAllowed(allowed) : notFound());
  }
  return handler(request, { params: Promise.resolve(params ?? {}) });
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
  if (segments.length === 0) {
    return Promise.resolve(notFound());
  }

  const [first, second, third, fourth] = segments;

  if (first === 'health' && segments.length === 1) {
    return dispatch(health, method, request);
  }

  if (first === 'db-action' && segments.length === 1) {
    return dispatch(dbAction, method, request);
  }

  if (first === 'update' && segments.length === 1) {
    return dispatch(update, method, request);
  }

  if (first === 'settings') {
    if (segments.length === 1) {
      return dispatch(settings, method, request);
    }
    if (second === 'maintenance' && segments.length === 2) {
      return dispatch(settingsMaintenance, method, request);
    }
    return Promise.resolve(notFound());
  }

  if (first === 'runs') {
    if (second === 'queue-status' && segments.length === 2) {
      return dispatch(runsQueueStatus, method, request);
    }
    if (second === 'enqueue' && segments.length === 2) {
      return dispatch(runsEnqueue, method, request);
    }
    if (second === 'dead-letter' && third === 'requeue' && segments.length === 3) {
      return dispatch(runsDeadLetterRequeue, method, request);
    }
    if (second && third === 'stream' && segments.length === 3) {
      return dispatch(runStream, method, request, { runId: second });
    }
    if (second && third === 'cancel' && segments.length === 3) {
      return dispatch(runCancel, method, request, { runId: second });
    }
    if (second && third === 'resume' && segments.length === 3) {
      return dispatch(runResume, method, request, { runId: second });
    }
    if (second && third === 'retry-node' && segments.length === 3) {
      return dispatch(runRetryNode, method, request, { runId: second });
    }
    if (segments.length === 1) {
      return dispatch(runsIndex, method, request);
    }
    if (second && segments.length === 2) {
      return dispatch(runById, method, request, { runId: second });
    }
    return Promise.resolve(notFound());
  }

  if (first === 'runtime-analytics') {
    if (second === 'summary' && segments.length === 2) {
      return dispatch(runtimeAnalyticsSummary, method, request);
    }
    if (second === 'insights' && segments.length === 2) {
      return dispatch(runtimeAnalyticsInsights, method, request);
    }
    return Promise.resolve(notFound());
  }

  if (first === 'trigger-buttons') {
    if (second === 'cleanup-fixtures' && segments.length === 2) {
      return dispatch(triggerButtonsCleanup, method, request);
    }
    if (second === 'reorder' && segments.length === 2) {
      return dispatch(triggerButtonsReorder, method, request);
    }
    if (segments.length === 1) {
      return dispatch(triggerButtons, method, request);
    }
    if (second && segments.length === 2) {
      return dispatch(triggerButtonsById, method, request, { id: second });
    }
    return Promise.resolve(notFound());
  }

  if (first === 'validation' && second === 'docs-snapshot' && segments.length === 2) {
    return dispatch(validationDocsSnapshot, method, request);
  }

  if (first === 'playwright') {
    if (second && third === 'artifacts' && fourth && segments.length === 4) {
      return dispatch(playwrightArtifact, method, request, { runId: second, file: fourth });
    }
    if (second && segments.length === 2) {
      return dispatch(playwrightRun, method, request, { runId: second });
    }
    if (segments.length === 1) {
      return dispatch(playwright, method, request);
    }
    return Promise.resolve(notFound());
  }

  if (first === 'portable-engine') {
    if (second === 'schema' && third === 'diff' && segments.length === 3) {
      return dispatch(portableEngineSchemaDiff, method, request);
    }
    if (second === 'schema' && segments.length === 2) {
      return dispatch(portableEngineSchema, method, request);
    }
    if (second === 'trend-snapshots' && segments.length === 2) {
      return dispatch(portableEngineTrendSnapshots, method, request);
    }
    if (second === 'remediation-dead-letters' && third === 'replay-history' && segments.length === 3) {
      return dispatch(portableEngineRemediationDeadLettersReplay, method, request);
    }
    if (second === 'remediation-dead-letters' && segments.length === 2) {
      return dispatch(portableEngineRemediationDeadLetters, method, request);
    }
    if (second === 'remediation-webhook' && segments.length === 2) {
      return dispatch(portableEngineRemediationWebhook, method, request);
    }
    return Promise.resolve(notFound());
  }

  return Promise.resolve(notFound());
};

const buildRouteHandler = (method: HttpMethod) =>
  apiHandler(
    async (request: NextRequest) => routeAiPaths(method, request, getPathSegments(request)),
    {
      source: `ai-paths.router.${method}`,
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
