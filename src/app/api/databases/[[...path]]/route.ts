export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { apiHandler } from '@/shared/lib/api/api-handler';

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
  if (segments.length === 0) {
    return Promise.resolve(notFound());
  }

  const [first, second, third, fourth, fifth] = segments;

  if (first === 'backup' && segments.length === 1) {
    return dispatch(backup, method, request);
  }

  if (first === 'backups' && segments.length === 1) {
    return dispatch(backups, method, request);
  }

  if (first === 'browse' && segments.length === 1) {
    return dispatch(browse, method, request);
  }

  if (first === 'copy-collection' && segments.length === 1) {
    return dispatch(copyCollection, method, request);
  }

  if (first === 'crud' && segments.length === 1) {
    return dispatch(crud, method, request);
  }

  if (first === 'delete' && segments.length === 1) {
    return dispatch(deleteDatabase, method, request);
  }

  if (first === 'execute' && segments.length === 1) {
    return dispatch(execute, method, request);
  }

  if (first === 'json-backup' && segments.length === 1) {
    return dispatch(jsonBackup, method, request);
  }

  if (first === 'json-restore' && segments.length === 1) {
    return dispatch(jsonRestore, method, request);
  }

  if (first === 'preview' && segments.length === 1) {
    return dispatch(preview, method, request);
  }

  if (first === 'redis' && segments.length === 1) {
    return dispatch(redis, method, request);
  }

  if (first === 'restore' && segments.length === 1) {
    return dispatch(restore, method, request);
  }

  if (first === 'schema' && segments.length === 1) {
    return dispatch(schema, method, request);
  }

  if (first === 'upload' && segments.length === 1) {
    return dispatch(upload, method, request);
  }

  if (first === 'engine') {
    if (second === 'provider-preview' && segments.length === 2) {
      return dispatch(engineProviderPreview, method, request);
    }
    if (second === 'status' && segments.length === 2) {
      return dispatch(engineStatus, method, request);
    }
    if (second === 'backup-scheduler') {
      if (third === 'tick' && segments.length === 3) {
        return dispatch(engineBackupSchedulerTick, method, request);
      }
      if (third === 'run-now' && segments.length === 3) {
        return dispatch(engineBackupSchedulerRunNow, method, request);
      }
      if (third === 'status' && segments.length === 3) {
        return dispatch(engineBackupSchedulerStatus, method, request);
      }
    }
    if (second === 'operations' && third === 'jobs') {
      if (segments.length === 3) {
        return dispatch(engineOperationsJobs, method, request);
      }
      if (fourth && fifth === 'cancel' && segments.length === 5) {
        return dispatch(engineOperationsJobCancel, method, request, { jobId: fourth });
      }
    }
  }

  return Promise.resolve(notFound());
};

const buildRouteHandler = (method: HttpMethod) =>
  apiHandler(
    async (request: NextRequest) => routeDatabases(method, request, getPathSegments(request)),
    {
      source: `databases.router.${method}`,
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
