export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type {
  CatchAllRouteDefinition as RouteDefinition,
  CatchAllRouteMethod as HttpMethod,
  CatchAllRouteModule as RouteModule,
  CatchAllRouteParams as Params,
  CatchAllRoutePathParams as RouteParams,
  CatchAllRoutePatternToken as PatternToken,
} from '@/shared/lib/api/catch-all-route-types';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

import * as integrationsIndex from '../route-handler';
import * as integrationsWithConnections from '../with-connections/route-handler';
import * as integrationsConnections from '../[id]/connections/route-handler';
import * as connectionsById from '../connections/[id]/route-handler';
import * as connectionSession from '../connections/[id]/session/route-handler';
import * as allegroAuthorize from '../[id]/connections/[connectionId]/allegro/authorize/route-handler';
import * as allegroCallback from '../[id]/connections/[connectionId]/allegro/callback/route-handler';
import * as allegroDisconnect from '../[id]/connections/[connectionId]/allegro/disconnect/route-handler';
import * as allegroRequest from '../[id]/connections/[connectionId]/allegro/request/route-handler';
import * as allegroTest from '../[id]/connections/[connectionId]/allegro/test/route-handler';
import * as linkedinAuthorize from '../[id]/connections/[connectionId]/linkedin/authorize/route-handler';
import * as linkedinCallbackLegacy from '../[id]/connections/[connectionId]/linkedin/callback/route-handler';
import * as linkedinCallbackStable from '../linkedin/callback/route-handler';
import * as linkedinDisconnect from '../[id]/connections/[connectionId]/linkedin/disconnect/route-handler';
import * as baseInventories from '../[id]/connections/[connectionId]/base/inventories/route-handler';
import * as baseProducts from '../[id]/connections/[connectionId]/base/products/route-handler';
import * as baseRequest from '../[id]/connections/[connectionId]/base/request/route-handler';
import * as baseTest from '../[id]/connections/[connectionId]/base/test/route-handler';
import * as connectionTest from '../[id]/connections/[connectionId]/test/route-handler';
import * as exportsBaseSetting from '../exports/base/[setting]/route-handler';
import * as imagesSyncBaseAll from '../images/sync-base/all/route-handler';
import * as importsBase from '../imports/base/route-handler';
import * as importsBaseParameters from '../imports/base/parameters/route-handler';
import * as importsBaseSetting from '../imports/base/[setting]/route-handler';
import * as importsBaseRuns from '../imports/base/runs/route-handler';
import * as importsBaseRun from '../imports/base/runs/[runId]/route-handler';
import * as importsBaseRunCancel from '../imports/base/runs/[runId]/cancel/route-handler';
import * as importsBaseRunReport from '../imports/base/runs/[runId]/report/route-handler';
import * as importsBaseRunResume from '../imports/base/runs/[runId]/resume/route-handler';
import * as importsBaseSample from '../imports/base/sample-product/route-handler';
import * as integrationsJobs from '../jobs/route-handler';
import * as productListings from '../product-listings/route-handler';
import * as integrationProductsListings from '../products/[id]/listings/route-handler';
import * as integrationProductListing from '../products/[id]/listings/[listingId]/route-handler';
import * as integrationProductListingDelete from '../products/[id]/listings/[listingId]/delete-from-base/route-handler';
import * as integrationProductListingPurge from '../products/[id]/listings/[listingId]/purge/route-handler';
import * as integrationProductListingRelist from '../products/[id]/listings/[listingId]/relist/route-handler';
import * as integrationProductListingSyncImages from '../products/[id]/listings/[listingId]/sync-base-images/route-handler';
import * as integrationProductLinkExisting from '../products/[id]/base/link-existing/route-handler';
import * as integrationProductSkuCheck from '../products/[id]/base/sku-check/route-handler';
import * as integrationProductExportToBase from '../products/[id]/export-to-base/route-handler';
import * as queuesTradera from '../queues/tradera/route-handler';

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
  const basePath = '/api/v2/integrations';
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
  { pattern: [], module: integrationsIndex },
  { pattern: ['with-connections'], module: integrationsWithConnections },
  { pattern: ['connections', param('id')], module: connectionsById },
  { pattern: ['connections', param('id'), 'session'], module: connectionSession },
  { pattern: ['exports', 'base', param('setting')], module: exportsBaseSetting },
  { pattern: ['images', 'sync-base', 'all'], module: imagesSyncBaseAll },
  { pattern: ['imports', 'base'], module: importsBase },
  { pattern: ['imports', 'base', 'parameters'], module: importsBaseParameters },
  { pattern: ['imports', 'base', 'runs'], module: importsBaseRuns },
  { pattern: ['imports', 'base', 'runs', param('runId')], module: importsBaseRun },
  { pattern: ['imports', 'base', 'runs', param('runId'), 'cancel'], module: importsBaseRunCancel },
  { pattern: ['imports', 'base', 'runs', param('runId'), 'report'], module: importsBaseRunReport },
  { pattern: ['imports', 'base', 'runs', param('runId'), 'resume'], module: importsBaseRunResume },
  { pattern: ['imports', 'base', 'sample-product'], module: importsBaseSample },
  { pattern: ['imports', 'base', param('setting')], module: importsBaseSetting },
  { pattern: ['jobs'], module: integrationsJobs },
  { pattern: ['product-listings'], module: productListings },
  { pattern: ['products', param('id'), 'base', 'link-existing'], module: integrationProductLinkExisting },
  { pattern: ['products', param('id'), 'base', 'sku-check'], module: integrationProductSkuCheck },
  { pattern: ['products', param('id'), 'export-to-base'], module: integrationProductExportToBase },
  { pattern: ['products', param('id'), 'listings'], module: integrationProductsListings },
  { pattern: ['products', param('id'), 'listings', param('listingId')], module: integrationProductListing },
  { pattern: ['products', param('id'), 'listings', param('listingId'), 'delete-from-base'], module: integrationProductListingDelete },
  { pattern: ['products', param('id'), 'listings', param('listingId'), 'purge'], module: integrationProductListingPurge },
  { pattern: ['products', param('id'), 'listings', param('listingId'), 'relist'], module: integrationProductListingRelist },
  { pattern: ['products', param('id'), 'listings', param('listingId'), 'sync-base-images'], module: integrationProductListingSyncImages },
  { pattern: ['queues', 'tradera'], module: queuesTradera },
  { pattern: [param('id'), 'connections'], module: integrationsConnections },
  { pattern: [param('id'), 'connections', param('connectionId'), 'test'], module: connectionTest },
  { pattern: [param('id'), 'connections', param('connectionId'), 'allegro', 'authorize'], module: allegroAuthorize },
  { pattern: [param('id'), 'connections', param('connectionId'), 'allegro', 'callback'], module: allegroCallback },
  { pattern: [param('id'), 'connections', param('connectionId'), 'allegro', 'disconnect'], module: allegroDisconnect },
  { pattern: [param('id'), 'connections', param('connectionId'), 'allegro', 'request'], module: allegroRequest },
  { pattern: [param('id'), 'connections', param('connectionId'), 'allegro', 'test'], module: allegroTest },
  { pattern: ['linkedin', 'callback'], module: linkedinCallbackStable },
  { pattern: [param('id'), 'connections', param('connectionId'), 'linkedin', 'authorize'], module: linkedinAuthorize },
  { pattern: [param('id'), 'connections', param('connectionId'), 'linkedin', 'callback'], module: linkedinCallbackLegacy },
  { pattern: [param('id'), 'connections', param('connectionId'), 'linkedin', 'disconnect'], module: linkedinDisconnect },
  { pattern: [param('id'), 'connections', param('connectionId'), 'base', 'inventories'], module: baseInventories },
  { pattern: [param('id'), 'connections', param('connectionId'), 'base', 'products'], module: baseProducts },
  { pattern: [param('id'), 'connections', param('connectionId'), 'base', 'request'], module: baseRequest },
  { pattern: [param('id'), 'connections', param('connectionId'), 'base', 'test'], module: baseTest },
];

const routeIntegrations = (
  method: HttpMethod,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const source = `v2.integrations.[[...path]].${method}`;
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
  (request: NextRequest, _ctx, _params) =>
    routeIntegrations('GET', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'v2.integrations.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeIntegrations('POST', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'v2.integrations.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeIntegrations('PUT', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'v2.integrations.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeIntegrations('PATCH', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'v2.integrations.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeIntegrations('DELETE', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'v2.integrations.[[...path]].DELETE', requireAuth: true }
);
