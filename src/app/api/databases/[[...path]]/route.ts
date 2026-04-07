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
import { assertDatabaseEngineManageAccess } from '@/features/database/server';

import * as backup from '../backup/route-handler';
import * as backups from '../backups/route-handler';
import * as browse from '../browse/route-handler';
import * as copyCollection from '../copy-collection/route-handler';
import * as crud from '../crud/route-handler';
import * as deleteDatabase from '../delete/route-handler';
import * as execute from '../execute/route-handler';
import * as jsonBackup from '../json-backup/route-handler';
import * as jsonRestore from '../json-restore/route-handler';
import * as preview from '../preview/route-handler';
import * as redis from '../redis/route-handler';
import * as restore from '../restore/route-handler';
import * as schema from '../schema/route-handler';
import * as upload from '../upload/route-handler';
import * as engineProviderPreview from '../engine/provider-preview/route-handler';
import * as engineStatus from '../engine/status/route-handler';
import * as engineBackupSchedulerTick from '../engine/backup-scheduler/tick/route-handler';
import * as engineBackupSchedulerRunNow from '../engine/backup-scheduler/run-now/route-handler';
import * as engineBackupSchedulerStatus from '../engine/backup-scheduler/status/route-handler';
import * as engineOperationsJobs from '../engine/operations/jobs/route-handler';
import * as engineOperationsJobCancel from '../engine/operations/jobs/[jobId]/cancel/route-handler';

const ROUTES = [
  { pattern: ['backup'], module: backup },
  { pattern: ['backups'], module: backups },
  { pattern: ['browse'], module: browse },
  { pattern: ['copy-collection'], module: copyCollection },
  { pattern: ['crud'], module: crud },
  { pattern: ['delete'], module: deleteDatabase },
  { pattern: ['execute'], module: execute },
  { pattern: ['json-backup'], module: jsonBackup },
  { pattern: ['json-restore'], module: jsonRestore },
  { pattern: ['preview'], module: preview },
  { pattern: ['redis'], module: redis },
  { pattern: ['restore'], module: restore },
  { pattern: ['schema'], module: schema },
  { pattern: ['upload'], module: upload },
  { pattern: ['engine', 'provider-preview'], module: engineProviderPreview },
  { pattern: ['engine', 'status'], module: engineStatus },
  { pattern: ['engine', 'backup-scheduler', 'tick'], module: engineBackupSchedulerTick },
  { pattern: ['engine', 'backup-scheduler', 'run-now'], module: engineBackupSchedulerRunNow },
  { pattern: ['engine', 'backup-scheduler', 'status'], module: engineBackupSchedulerStatus },
  { pattern: ['engine', 'operations', 'jobs'], module: engineOperationsJobs },
  { pattern: ['engine', 'operations', 'jobs', { param: 'jobId' }, 'cancel'], module: engineOperationsJobCancel },
];

const routeDatabases = async (
  method: HttpMethod,
  request: NextRequest,
): Promise<Response> => {
  await assertDatabaseEngineManageAccess();
  return handleCatchAllRequest(
    method,
    request,
    getPathSegments(request, '/api/databases'),
    ROUTES,
    'databases'
  );
};

const ROUTER_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
} as const;

export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeDatabases('GET', request),
  { ...ROUTER_OPTIONS, source: 'databases.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeDatabases('POST', request),
  { ...ROUTER_OPTIONS, source: 'databases.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeDatabases('PUT', request),
  { ...ROUTER_OPTIONS, source: 'databases.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeDatabases('PATCH', request),
  { ...ROUTER_OPTIONS, source: 'databases.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeDatabases('DELETE', request),
  { ...ROUTER_OPTIONS, source: 'databases.[[...path]].DELETE', requireAuth: true }
);
