export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import { assertDatabaseEngineManageAccess } from '@/shared/lib/db/services/database-engine-access';

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
  const basePath = '/api/databases';
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith(basePath)) {
    return [];
  }
  const remainder = pathname.slice(basePath.length).replace(/^\/+/, '');
  return remainder ? remainder.split('/').filter(Boolean) : [];
};

const routeDatabases = (
  method: HttpMethod,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const source = `databases.[[...path]].${method}`;
  if (segments.length === 0) {
    return notFound(request, source);
  }

  const [first, second, third, fourth, fifth] = segments;

  if (first === 'backup' && segments.length === 1) {
    return dispatch(backup, method, request, undefined, source);
  }

  if (first === 'backups' && segments.length === 1) {
    return dispatch(backups, method, request, undefined, source);
  }

  if (first === 'browse' && segments.length === 1) {
    return dispatch(browse, method, request, undefined, source);
  }

  if (first === 'copy-collection' && segments.length === 1) {
    return dispatch(copyCollection, method, request, undefined, source);
  }

  if (first === 'crud' && segments.length === 1) {
    return dispatch(crud, method, request, undefined, source);
  }

  if (first === 'delete' && segments.length === 1) {
    return dispatch(deleteDatabase, method, request, undefined, source);
  }

  if (first === 'execute' && segments.length === 1) {
    return dispatch(execute, method, request, undefined, source);
  }

  if (first === 'json-backup' && segments.length === 1) {
    return dispatch(jsonBackup, method, request, undefined, source);
  }

  if (first === 'json-restore' && segments.length === 1) {
    return dispatch(jsonRestore, method, request, undefined, source);
  }

  if (first === 'preview' && segments.length === 1) {
    return dispatch(preview, method, request, undefined, source);
  }

  if (first === 'redis' && segments.length === 1) {
    return dispatch(redis, method, request, undefined, source);
  }

  if (first === 'restore' && segments.length === 1) {
    return dispatch(restore, method, request, undefined, source);
  }

  if (first === 'schema' && segments.length === 1) {
    return dispatch(schema, method, request, undefined, source);
  }

  if (first === 'upload' && segments.length === 1) {
    return dispatch(upload, method, request, undefined, source);
  }

  if (first === 'engine') {
    if (second === 'provider-preview' && segments.length === 2) {
      return dispatch(engineProviderPreview, method, request, undefined, source);
    }
    if (second === 'status' && segments.length === 2) {
      return dispatch(engineStatus, method, request, undefined, source);
    }
    if (second === 'backup-scheduler') {
      if (third === 'tick' && segments.length === 3) {
        return dispatch(engineBackupSchedulerTick, method, request, undefined, source);
      }
      if (third === 'run-now' && segments.length === 3) {
        return dispatch(engineBackupSchedulerRunNow, method, request, undefined, source);
      }
      if (third === 'status' && segments.length === 3) {
        return dispatch(engineBackupSchedulerStatus, method, request, undefined, source);
      }
    }
    if (second === 'operations' && third === 'jobs') {
      if (segments.length === 3) {
        return dispatch(engineOperationsJobs, method, request, undefined, source);
      }
      if (fourth && fifth === 'cancel' && segments.length === 5) {
        return dispatch(engineOperationsJobCancel, method, request, { jobId: fourth }, source);
      }
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
  async (request: NextRequest, _ctx, _params) => {
    await assertDatabaseEngineManageAccess();
    return routeDatabases('GET', request, getPathSegments(request));
  },
  { ...ROUTER_OPTIONS, source: 'databases.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  async (request: NextRequest, _ctx, _params) => {
    await assertDatabaseEngineManageAccess();
    return routeDatabases('POST', request, getPathSegments(request));
  },
  { ...ROUTER_OPTIONS, source: 'databases.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  async (request: NextRequest, _ctx, _params) => {
    await assertDatabaseEngineManageAccess();
    return routeDatabases('PUT', request, getPathSegments(request));
  },
  { ...ROUTER_OPTIONS, source: 'databases.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  async (request: NextRequest, _ctx, _params) => {
    await assertDatabaseEngineManageAccess();
    return routeDatabases('PATCH', request, getPathSegments(request));
  },
  { ...ROUTER_OPTIONS, source: 'databases.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  async (request: NextRequest, _ctx, _params) => {
    await assertDatabaseEngineManageAccess();
    return routeDatabases('DELETE', request, getPathSegments(request));
  },
  { ...ROUTER_OPTIONS, source: 'databases.[[...path]].DELETE', requireAuth: true }
);
