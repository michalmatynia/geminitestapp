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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- route modules define their own param shapes.
type RouteModule = Partial<Record<HttpMethod, RouteHandler<any>>>;
type PatternToken = string | { param: string };
type RouteDefinition = { pattern: PatternToken[]; module: RouteModule };

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
  const basePath = '/api/databases';
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith(basePath)) {
    return [];
  }
  const remainder = pathname.slice(basePath.length).replace(/^\/+/, '');
  return remainder ? remainder.split('/').filter(Boolean) : [];
};

const param = (name: string): PatternToken => ({ param: name });

const matchPattern = (pattern: PatternToken[], segments: string[]): Params | null => {
  if (pattern.length !== segments.length) {
    return null;
  }
  const params: Params = {};
  for (let index = 0; index < pattern.length; index += 1) {
    const token = pattern[index];
    if (!token) {
      return null;
    }
    const segment = segments[index];
    if (!segment) {
      return null;
    }
    if (typeof token === 'string') {
      if (token !== segment) {
        return null;
      }
      continue;
    }
    params[token.param] = segment;
  }
  return params;
};

const ROUTES: RouteDefinition[] = [
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
  { pattern: ['engine', 'operations', 'jobs', param('jobId'), 'cancel'], module: engineOperationsJobCancel },
];

const routeDatabases = (
  method: HttpMethod,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const source = `databases.[[...path]].${method}`;
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
