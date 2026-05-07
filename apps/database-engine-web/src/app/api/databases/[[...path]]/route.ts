import { type NextRequest } from 'next/server';

import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import {
  type CatchAllRouteMethod as HttpMethod,
  type CatchAllRoutePathParams as RouteParams,
  getPathSegments,
  handleCatchAllRequest,
} from '@/shared/lib/api/catch-all-router';

import * as backup from '@/features/database/server/api/backup/route-handler';
import * as backups from '@/features/database/server/api/backups/route-handler';
import * as browse from '@/features/database/server/api/browse/route-handler';
import * as copyCollection from '@/features/database/server/api/copy-collection/route-handler';
import * as crud from '@/features/database/server/api/crud/route-handler';
import * as deleteDatabase from '@/features/database/server/api/delete/route-handler';
import * as execute from '@/features/database/server/api/execute/route-handler';
import * as jsonBackup from '@/features/database/server/api/json-backup/route-handler';
import * as jsonRestore from '@/features/database/server/api/json-restore/route-handler';
import * as preview from '@/features/database/server/api/preview/route-handler';
import * as redis from '@/features/database/server/api/redis/route-handler';
import * as restore from '@/features/database/server/api/restore/route-handler';
import * as schema from '@/features/database/server/api/schema/route-handler';
import * as upload from '@/features/database/server/api/upload/route-handler';
import * as engineProviderPreview from '@/features/database/server/api/engine/provider-preview/route-handler';
import * as engineStatus from '@/features/database/server/api/engine/status/route-handler';
import * as engineSource from '@/features/database/server/api/engine/source/route-handler';
import * as engineSourceSync from '@/features/database/server/api/engine/source/sync/route-handler';
import * as engineManaged from '@/features/database/server/api/engine/managed/route-handler';
import * as engineManagedBackup from '@/features/database/server/api/engine/managed/backup/route-handler';
import * as engineManagedSync from '@/features/database/server/api/engine/managed/sync/route-handler';
import * as engineBackupSchedulerTick from '@/features/database/server/api/engine/backup-scheduler/tick/route-handler';
import * as engineBackupSchedulerRunNow from '@/features/database/server/api/engine/backup-scheduler/run-now/route-handler';
import * as engineBackupSchedulerStatus from '@/features/database/server/api/engine/backup-scheduler/status/route-handler';
import * as engineOperationsJobs from '@/features/database/server/api/engine/operations/jobs/route-handler';
import * as engineOperationsJobCancel from '@/features/database/server/api/engine/operations/jobs/[jobId]/cancel/route-handler';

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
  { pattern: ['engine', 'source'], module: engineSource },
  { pattern: ['engine', 'source', 'sync'], module: engineSourceSync },
  { pattern: ['engine', 'managed'], module: engineManaged },
  { pattern: ['engine', 'managed', 'backup'], module: engineManagedBackup },
  { pattern: ['engine', 'managed', 'sync'], module: engineManagedSync },
  { pattern: ['engine', 'backup-scheduler', 'tick'], module: engineBackupSchedulerTick },
  { pattern: ['engine', 'backup-scheduler', 'run-now'], module: engineBackupSchedulerRunNow },
  { pattern: ['engine', 'backup-scheduler', 'status'], module: engineBackupSchedulerStatus },
  { pattern: ['engine', 'operations', 'jobs'], module: engineOperationsJobs },
  {
    pattern: ['engine', 'operations', 'jobs', { param: 'jobId' }, 'cancel'],
    module: engineOperationsJobCancel,
  },
];

const routeDatabases = async (method: HttpMethod, request: NextRequest): Promise<Response> => {
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
  { ...ROUTER_OPTIONS, source: 'database-engine-web.databases.[[...path]].GET', requireAuth: true }
);

export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeDatabases('POST', request),
  { ...ROUTER_OPTIONS, source: 'database-engine-web.databases.[[...path]].POST', requireAuth: true }
);

export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeDatabases('PUT', request),
  { ...ROUTER_OPTIONS, source: 'database-engine-web.databases.[[...path]].PUT', requireAuth: true }
);

export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeDatabases('PATCH', request),
  { ...ROUTER_OPTIONS, source: 'database-engine-web.databases.[[...path]].PATCH', requireAuth: true }
);

export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) => routeDatabases('DELETE', request),
  { ...ROUTER_OPTIONS, source: 'database-engine-web.databases.[[...path]].DELETE', requireAuth: true }
);
