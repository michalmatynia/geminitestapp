export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { apiHandler } from '@/shared/lib/api/api-handler';

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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Params = Record<string, string>;
type RouteHandler<P extends Params = Params> = (
  request: NextRequest,
  context: { params: P | Promise<P> }
) => Promise<Response>;
type RouteModule<P extends Params = Params> = Partial<Record<HttpMethod, RouteHandler<P>>>;

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const notFound = (): Response => new Response('Not Found', { status: 404 });
const methodNotAllowed = (allowed: HttpMethod[]): Response =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: allowed.join(', ') },
  });

const getAllowedMethods = <P extends Params>(module: RouteModule<P>): HttpMethod[] =>
  HTTP_METHODS.filter((method) => typeof module[method] === 'function');

const dispatch = <P extends Params>(
  module: RouteModule<P>,
  method: HttpMethod,
  request: NextRequest,
  params?: P
): Promise<Response> => {
  const handler = module[method];
  if (!handler) {
    const allowed = getAllowedMethods(module);
    return Promise.resolve(allowed.length > 0 ? methodNotAllowed(allowed) : notFound());
  }
  return handler(request, { params: Promise.resolve(params ?? ({} as P)) });
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

const routeIntegrations = (
  method: HttpMethod,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length === 0) {
    return dispatch(integrationsIndex, method, request);
  }

  const [first, second, third, fourth, fifth] = segments;

  if (first === 'with-connections' && segments.length === 1) {
    return dispatch(integrationsWithConnections, method, request);
  }

  if (first === 'connections') {
    if (second && segments.length === 2) {
      return dispatch(connectionsById, method, request, { id: second });
    }
    if (second && third === 'session' && segments.length === 3) {
      return dispatch(connectionSession, method, request, { id: second });
    }
    return Promise.resolve(notFound());
  }

  if (first === 'exports' && second === 'base' && third && segments.length === 3) {
    return dispatch(exportsBaseSetting, method, request, { setting: third });
  }

  if (first === 'images' && second === 'sync-base' && third === 'all' && segments.length === 3) {
    return dispatch(imagesSyncBaseAll, method, request);
  }

  if (first === 'imports' && second === 'base') {
    if (!third && segments.length === 2) {
      return dispatch(importsBase, method, request);
    }
    if (third === 'parameters' && segments.length === 3) {
      return dispatch(importsBaseParameters, method, request);
    }
    if (third === 'runs') {
      if (!fourth && segments.length === 3) {
        return dispatch(importsBaseRuns, method, request);
      }
      if (fourth && segments.length === 4) {
        return dispatch(importsBaseRun, method, request, { runId: fourth });
      }
      if (fourth && fifth === 'cancel' && segments.length === 5) {
        return dispatch(importsBaseRunCancel, method, request, { runId: fourth });
      }
      if (fourth && fifth === 'report' && segments.length === 5) {
        return dispatch(importsBaseRunReport, method, request, { runId: fourth });
      }
      if (fourth && fifth === 'resume' && segments.length === 5) {
        return dispatch(importsBaseRunResume, method, request, { runId: fourth });
      }
      return Promise.resolve(notFound());
    }
    if (third === 'sample-product' && segments.length === 3) {
      return dispatch(importsBaseSample, method, request);
    }
    if (third && segments.length === 3) {
      return dispatch(importsBaseSetting, method, request, { setting: third });
    }
    return Promise.resolve(notFound());
  }

  if (first === 'jobs' && segments.length === 1) {
    return dispatch(integrationsJobs, method, request);
  }

  if (first === 'product-listings' && segments.length === 1) {
    return dispatch(productListings, method, request);
  }

  if (first === 'products') {
    if (second && !third && segments.length === 2) {
      return Promise.resolve(notFound());
    }
    if (second && third === 'base' && fourth === 'link-existing' && segments.length === 4) {
      return dispatch(integrationProductLinkExisting, method, request, { id: second });
    }
    if (second && third === 'base' && fourth === 'sku-check' && segments.length === 4) {
      return dispatch(integrationProductSkuCheck, method, request, { id: second });
    }
    if (second && third === 'export-to-base' && segments.length === 3) {
      return dispatch(integrationProductExportToBase, method, request, { id: second });
    }
    if (second && third === 'listings' && !fourth && segments.length === 3) {
      return dispatch(integrationProductsListings, method, request, { id: second });
    }
    if (second && third === 'listings' && fourth && segments.length >= 4) {
      const listingId = fourth;
      if (segments.length === 4) {
        return dispatch(integrationProductListing, method, request, { id: second, listingId });
      }
      const action = segments[4];
      if (action === 'delete-from-base' && segments.length === 5) {
        return dispatch(integrationProductListingDelete, method, request, { id: second, listingId });
      }
      if (action === 'purge' && segments.length === 5) {
        return dispatch(integrationProductListingPurge, method, request, { id: second, listingId });
      }
      if (action === 'relist' && segments.length === 5) {
        return dispatch(integrationProductListingRelist, method, request, { id: second, listingId });
      }
      if (action === 'sync-base-images' && segments.length === 5) {
        return dispatch(integrationProductListingSyncImages, method, request, {
          id: second,
          listingId,
        });
      }
      return Promise.resolve(notFound());
    }
  }

  if (first === 'queues' && second === 'tradera' && segments.length === 2) {
    return dispatch(queuesTradera, method, request);
  }

  if (first && second === 'connections') {
    const integrationId = first;
    if (!third && segments.length === 2) {
      return dispatch(integrationsConnections, method, request, { id: integrationId });
    }
    if (third) {
      const connectionId = third;
      if (fourth === 'test' && segments.length === 4) {
        return dispatch(connectionTest, method, request, { id: integrationId, connectionId });
      }
      if (fourth === 'allegro') {
        if (fifth === 'authorize' && segments.length === 5) {
          return dispatch(allegroAuthorize, method, request, { id: integrationId, connectionId });
        }
        if (fifth === 'callback' && segments.length === 5) {
          return dispatch(allegroCallback, method, request, { id: integrationId, connectionId });
        }
        if (fifth === 'disconnect' && segments.length === 5) {
          return dispatch(allegroDisconnect, method, request, { id: integrationId, connectionId });
        }
        if (fifth === 'request' && segments.length === 5) {
          return dispatch(allegroRequest, method, request, { id: integrationId, connectionId });
        }
        if (fifth === 'test' && segments.length === 5) {
          return dispatch(allegroTest, method, request, { id: integrationId, connectionId });
        }
      }
      if (fourth === 'base') {
        if (fifth === 'inventories' && segments.length === 5) {
          return dispatch(baseInventories, method, request, { id: integrationId, connectionId });
        }
        if (fifth === 'products' && segments.length === 5) {
          return dispatch(baseProducts, method, request, { id: integrationId, connectionId });
        }
        if (fifth === 'request' && segments.length === 5) {
          return dispatch(baseRequest, method, request, { id: integrationId, connectionId });
        }
        if (fifth === 'test' && segments.length === 5) {
          return dispatch(baseTest, method, request, { id: integrationId, connectionId });
        }
      }
    }
  }

  return Promise.resolve(notFound());
};

const buildRouteHandler = (method: HttpMethod) =>
  apiHandler(
    async (request: NextRequest) => routeIntegrations(method, request, getPathSegments(request)),
    {
      source: `v2.integrations.router.${method}`,
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
