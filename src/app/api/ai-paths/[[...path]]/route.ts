
import { NextRequest } from 'next/server';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import {
  type CatchAllRouteMethod as HttpMethod,
  type CatchAllRoutePathParams as RouteParams,
  getPathSegments,
  handleCatchAllRequest,
} from '@/shared/lib/api/catch-all-router';

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

const ROUTES = [
  { pattern: ['health'], module: health },
  { pattern: ['db-action'], module: dbAction },
  { pattern: ['update'], module: update },
  { pattern: ['settings'], module: settings },
  { pattern: ['settings', 'maintenance'], module: settingsMaintenance },
  { pattern: ['runs', 'queue-status'], module: runsQueueStatus },
  { pattern: ['runs', 'enqueue'], module: runsEnqueue },
  { pattern: ['runs', 'dead-letter', 'requeue'], module: runsDeadLetterRequeue },
  { pattern: ['runs', { param: 'runId' }, 'stream'], module: runStream },
  { pattern: ['runs', { param: 'runId' }, 'cancel'], module: runCancel },
  { pattern: ['runs', { param: 'runId' }, 'resume'], module: runResume },
  { pattern: ['runs', { param: 'runId' }, 'retry-node'], module: runRetryNode },
  { pattern: ['runs'], module: runsIndex },
  { pattern: ['runs', { param: 'runId' }], module: runById },
  { pattern: ['runtime-analytics', 'summary'], module: runtimeAnalyticsSummary },
  { pattern: ['runtime-analytics', 'insights'], module: runtimeAnalyticsInsights },
  { pattern: ['trigger-buttons', 'cleanup-fixtures'], module: triggerButtonsCleanup },
  { pattern: ['trigger-buttons', 'reorder'], module: triggerButtonsReorder },
  { pattern: ['trigger-buttons'], module: triggerButtons },
  { pattern: ['trigger-buttons', { param: 'id' }], module: triggerButtonsById },
  { pattern: ['validation', 'docs-snapshot'], module: validationDocsSnapshot },
  { pattern: ['playwright', { param: 'runId' }, 'artifacts', { param: 'file' }], module: playwrightArtifact },
  { pattern: ['playwright', { param: 'runId' }], module: playwrightRun },
  { pattern: ['playwright'], module: playwright },
  { pattern: ['portable-engine', 'schema', 'diff'], module: portableEngineSchemaDiff },
  { pattern: ['portable-engine', 'schema'], module: portableEngineSchema },
  { pattern: ['portable-engine', 'trend-snapshots'], module: portableEngineTrendSnapshots },
  { pattern: ['portable-engine', 'remediation-dead-letters', 'replay-history'], module: portableEngineRemediationDeadLettersReplay },
  { pattern: ['portable-engine', 'remediation-dead-letters'], module: portableEngineRemediationDeadLetters },
  { pattern: ['portable-engine', 'remediation-webhook'], module: portableEngineRemediationWebhook },
];

const routeAiPaths = (
  method: HttpMethod,
  request: NextRequest,
): Promise<Response> => handleCatchAllRequest(
  method,
  request,
  getPathSegments(request, '/api/ai-paths'),
  ROUTES,
  'ai-paths'
);

const ROUTER_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
} as const;

export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeAiPaths('GET', request),
  { ...ROUTER_OPTIONS, source: 'ai-paths.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeAiPaths('POST', request),
  { ...ROUTER_OPTIONS, source: 'ai-paths.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeAiPaths('PUT', request),
  { ...ROUTER_OPTIONS, source: 'ai-paths.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeAiPaths('PATCH', request),
  { ...ROUTER_OPTIONS, source: 'ai-paths.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeAiPaths('DELETE', request),
  { ...ROUTER_OPTIONS, source: 'ai-paths.[[...path]].DELETE', requireAuth: true }
);
