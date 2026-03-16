export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

import * as productsIndex from '../route-handler';
import * as productsCount from '../count/route-handler';
import * as productsPaged from '../paged/route-handler';
import * as productsIds from '../ids/route-handler';
import * as productsSimpleParameters from '../simple-parameters/route-handler';
import * as productsParameters from '../parameters/route-handler';
import * as productsParametersId from '../parameters/[id]/route-handler';
import * as productsProducers from '../producers/route-handler';
import * as productsProducersId from '../producers/[id]/route-handler';
import * as productsTags from '../tags/route-handler';
import * as productsTagsAll from '../tags/all/route-handler';
import * as productsTagsId from '../tags/[id]/route-handler';
import * as productsValidation from '../validation/route-handler';
import * as productsValidatorConfig from '../validator-config/route-handler';
import * as productsValidatorDecisions from '../validator-decisions/route-handler';
import * as productsValidatorSettings from '../validator-settings/route-handler';
import * as productsValidatorPatterns from '../validator-patterns/route-handler';
import * as productsValidatorPatternsId from '../validator-patterns/[id]/route-handler';
import * as productsValidatorPatternsImport from '../validator-patterns/import/route-handler';
import * as productsValidatorPatternsReorder from '../validator-patterns/reorder/route-handler';
import * as productsValidatorPatternsTemplates from '../validator-patterns/templates/[type]/route-handler';
import * as productsValidatorRuntimeEvaluate from '../validator-runtime/evaluate/route-handler';
import * as productsCategories from '../categories/route-handler';
import * as productsCategoriesId from '../categories/[id]/route-handler';
import * as productsCategoriesTree from '../categories/tree/route-handler';
import * as productsCategoriesBatch from '../categories/batch/route-handler';
import * as productsCategoriesMigrate from '../categories/migrate/route-handler';
import * as productsCategoriesReorder from '../categories/reorder/route-handler';
import * as productsEntitiesType from '../entities/[type]/route-handler';
import * as productsEntitiesTypeId from '../entities/[type]/[id]/route-handler';
import * as productsEntitiesCatalogsAssign from '../entities/catalogs/assign/route-handler';
import * as productsMetadataType from '../metadata/[type]/route-handler';
import * as productsMetadataTypeId from '../metadata/[type]/[id]/route-handler';
import * as productsImagesBase64 from '../images/base64/route-handler';
import * as productsImagesBase64All from '../images/base64/all/route-handler';
import * as productsImagesUpload from '../images/upload/route-handler';
import * as productsImportCsv from '../import/csv/route-handler';
import * as productsAiJobs from '../ai-jobs/route-handler';
import * as productsAiJobsJob from '../ai-jobs/[jobId]/route-handler';
import * as productsAiJobsBulk from '../ai-jobs/bulk/route-handler';
import * as productsAiJobsEnqueue from '../ai-jobs/enqueue/route-handler';
import * as productsAiPathsDescriptionContext from '../ai-paths/description-context/route-handler';
import * as productsSyncProfiles from '../sync/profiles/route-handler';
import * as productsSyncProfilesId from '../sync/profiles/[id]/route-handler';
import * as productsSyncProfilesRun from '../sync/profiles/[id]/run/route-handler';
import * as productsSyncRuns from '../sync/runs/route-handler';
import * as productsSyncRunsId from '../sync/runs/[runId]/route-handler';
import * as productsSyncRelink from '../sync/relink/route-handler';
import * as productIdRoute from '../[id]/route-handler';
import * as productDuplicate from '../[id]/duplicate/route-handler';
import * as productImagesBase64 from '../[id]/images/base64/route-handler';
import * as productImagesLinkToFile from '../[id]/images/link-to-file/route-handler';
import * as productImagesById from '../[id]/images/[imageFileId]/route-handler';
import * as productStudio from '../[id]/studio/route-handler';
import * as productStudioAction from '../[id]/studio/[action]/route-handler';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Params = Record<string, string>;
type RouteParams = { path?: string[] | string };
type RouteHandler<P extends Params = Params> = (
  request: NextRequest,
  context: { params: P | Promise<P> }
) => Promise<Response>;
type RouteModule<P extends Params = Params> = Partial<Record<HttpMethod, RouteHandler<P>>>;

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const buildSource = (method: HttpMethod): string => `v2.products.[[...path]].${method}`;

const notFound = async (request: NextRequest, method: HttpMethod): Promise<Response> =>
  createErrorResponse(notFoundError('Not Found'), { request, source: buildSource(method) });
const methodNotAllowed = async (
  request: NextRequest,
  allowed: HttpMethod[],
  method: HttpMethod
): Promise<Response> => {
  const response = await createErrorResponse(
    methodNotAllowedError('Method not allowed', { allowedMethods: allowed }),
    { request, source: buildSource(method) }
  );
  response.headers.set('Allow', allowed.join(', '));
  return response;
};

const getAllowedMethods = <P extends Params>(module: RouteModule<P>): HttpMethod[] =>
  HTTP_METHODS.filter((method) => typeof module[method] === 'function');

const dispatch = async <P extends Params>(
  module: RouteModule<P>,
  method: HttpMethod,
  request: NextRequest,
  params?: P
): Promise<Response> => {
  const handler = module[method];
  if (!handler) {
    const allowed = getAllowedMethods(module);
    return allowed.length > 0
      ? methodNotAllowed(request, allowed, method)
      : notFound(request, method);
  }
  return handler(request, { params: Promise.resolve(params ?? ({} as P)) });
};

const getPathSegments = (request: NextRequest): string[] => {
  const basePath = '/api/v2/products';
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith(basePath)) {
    return [];
  }
  const remainder = pathname.slice(basePath.length).replace(/^\/+/, '');
  return remainder ? remainder.split('/').filter(Boolean) : [];
};

const routeProducts = (
  method: HttpMethod,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length === 0) {
    return dispatch(productsIndex, method, request);
  }

  const [first, second, third, fourth] = segments;

  if (first === 'count' && segments.length === 1) {
    return dispatch(productsCount, method, request);
  }

  if (first === 'paged' && segments.length === 1) {
    return dispatch(productsPaged, method, request);
  }

  if (first === 'ids' && segments.length === 1) {
    return dispatch(productsIds, method, request);
  }

  if (first === 'simple-parameters' && segments.length === 1) {
    return dispatch(productsSimpleParameters, method, request);
  }

  if (first === 'parameters') {
    if (!second && segments.length === 1) {
      return dispatch(productsParameters, method, request);
    }
    if (second && segments.length === 2) {
      return dispatch(productsParametersId, method, request, { id: second });
    }
    return notFound(request, method);
  }

  if (first === 'producers') {
    if (!second && segments.length === 1) {
      return dispatch(productsProducers, method, request);
    }
    if (second && segments.length === 2) {
      return dispatch(productsProducersId, method, request, { id: second });
    }
    return notFound(request, method);
  }

  if (first === 'tags') {
    if (!second && segments.length === 1) {
      return dispatch(productsTags, method, request);
    }
    if (second === 'all' && segments.length === 2) {
      return dispatch(productsTagsAll, method, request);
    }
    if (second && segments.length === 2) {
      return dispatch(productsTagsId, method, request, { id: second });
    }
    return notFound(request, method);
  }

  if (first === 'validation' && segments.length === 1) {
    return dispatch(productsValidation, method, request);
  }

  if (first === 'validator-config' && segments.length === 1) {
    return dispatch(productsValidatorConfig, method, request);
  }

  if (first === 'validator-decisions' && segments.length === 1) {
    return dispatch(productsValidatorDecisions, method, request);
  }

  if (first === 'validator-settings' && segments.length === 1) {
    return dispatch(productsValidatorSettings, method, request);
  }

  if (first === 'validator-patterns') {
    if (!second && segments.length === 1) {
      return dispatch(productsValidatorPatterns, method, request);
    }
    if (second === 'import' && segments.length === 2) {
      return dispatch(productsValidatorPatternsImport, method, request);
    }
    if (second === 'reorder' && segments.length === 2) {
      return dispatch(productsValidatorPatternsReorder, method, request);
    }
    if (second === 'templates' && third && segments.length === 3) {
      return dispatch(productsValidatorPatternsTemplates, method, request, { type: third });
    }
    if (second && segments.length === 2) {
      return dispatch(productsValidatorPatternsId, method, request, { id: second });
    }
    return notFound(request, method);
  }

  if (first === 'validator-runtime' && second === 'evaluate' && segments.length === 2) {
    return dispatch(productsValidatorRuntimeEvaluate, method, request);
  }

  if (first === 'categories') {
    if (!second && segments.length === 1) {
      return dispatch(productsCategories, method, request);
    }
    if (second === 'tree' && segments.length === 2) {
      return dispatch(productsCategoriesTree, method, request);
    }
    if (second === 'batch' && segments.length === 2) {
      return dispatch(productsCategoriesBatch, method, request);
    }
    if (second === 'migrate' && segments.length === 2) {
      return dispatch(productsCategoriesMigrate, method, request);
    }
    if (second === 'reorder' && segments.length === 2) {
      return dispatch(productsCategoriesReorder, method, request);
    }
    if (second && segments.length === 2) {
      return dispatch(productsCategoriesId, method, request, { id: second });
    }
    return notFound(request, method);
  }

  if (first === 'entities') {
    if (second === 'catalogs' && third === 'assign' && segments.length === 3) {
      return dispatch(productsEntitiesCatalogsAssign, method, request);
    }
    if (second && segments.length === 2) {
      return dispatch(productsEntitiesType, method, request, { type: second });
    }
    if (second && third && segments.length === 3) {
      return dispatch(productsEntitiesTypeId, method, request, { type: second, id: third });
    }
    return notFound(request, method);
  }

  if (first === 'metadata') {
    if (second && segments.length === 2) {
      return dispatch(productsMetadataType, method, request, { type: second });
    }
    if (second && third && segments.length === 3) {
      return dispatch(productsMetadataTypeId, method, request, { type: second, id: third });
    }
    return notFound(request, method);
  }

  if (first === 'images') {
    if (second === 'base64' && segments.length === 2) {
      return dispatch(productsImagesBase64, method, request);
    }
    if (second === 'base64' && third === 'all' && segments.length === 3) {
      return dispatch(productsImagesBase64All, method, request);
    }
    if (second === 'upload' && segments.length === 2) {
      return dispatch(productsImagesUpload, method, request);
    }
    return notFound(request, method);
  }

  if (first === 'import' && second === 'csv' && segments.length === 2) {
    return dispatch(productsImportCsv, method, request);
  }

  if (first === 'ai-jobs') {
    if (!second && segments.length === 1) {
      return dispatch(productsAiJobs, method, request);
    }
    if (second === 'bulk' && segments.length === 2) {
      return dispatch(productsAiJobsBulk, method, request);
    }
    if (second === 'enqueue' && segments.length === 2) {
      return dispatch(productsAiJobsEnqueue, method, request);
    }
    if (second && segments.length === 2) {
      return dispatch(productsAiJobsJob, method, request, { jobId: second });
    }
    return notFound(request, method);
  }

  if (first === 'ai-paths' && second === 'description-context' && segments.length === 2) {
    return dispatch(productsAiPathsDescriptionContext, method, request);
  }

  if (first === 'sync') {
    if (second === 'profiles' && segments.length === 2) {
      return dispatch(productsSyncProfiles, method, request);
    }
    if (second === 'profiles' && third && segments.length === 3) {
      return dispatch(productsSyncProfilesId, method, request, { id: third });
    }
    if (second === 'profiles' && third && fourth === 'run' && segments.length === 4) {
      return dispatch(productsSyncProfilesRun, method, request, { id: third });
    }
    if (second === 'runs' && segments.length === 2) {
      return dispatch(productsSyncRuns, method, request);
    }
    if (second === 'runs' && third && segments.length === 3) {
      return dispatch(productsSyncRunsId, method, request, { runId: third });
    }
    if (second === 'relink' && segments.length === 2) {
      return dispatch(productsSyncRelink, method, request);
    }
    return notFound(request, method);
  }

  if (first && segments.length === 1) {
    return dispatch(productIdRoute, method, request, { id: first });
  }

  if (first && second) {
    if (second === 'duplicate' && segments.length === 2) {
      return dispatch(productDuplicate, method, request, { id: first });
    }
    if (second === 'images') {
      if (third === 'base64' && segments.length === 3) {
        return dispatch(productImagesBase64, method, request, { id: first });
      }
      if (third === 'link-to-file' && segments.length === 3) {
        return dispatch(productImagesLinkToFile, method, request, { id: first });
      }
      if (third && segments.length === 3) {
        return dispatch(productImagesById, method, request, { id: first, imageFileId: third });
      }
    }
    if (second === 'studio') {
      if (!third && segments.length === 2) {
        return dispatch(productStudio, method, request, { id: first });
      }
      if (third && segments.length === 3) {
        return dispatch(productStudioAction, method, request, { id: first, action: third });
      }
    }
  }

  return notFound(request, method);
};

export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeProducts('GET', request, getPathSegments(request)),
  { source: 'v2.products.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeProducts('POST', request, getPathSegments(request)),
  { source: 'v2.products.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeProducts('PUT', request, getPathSegments(request)),
  { source: 'v2.products.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeProducts('PATCH', request, getPathSegments(request)),
  { source: 'v2.products.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeProducts('DELETE', request, getPathSegments(request)),
  { source: 'v2.products.[[...path]].DELETE', requireAuth: true }
);
