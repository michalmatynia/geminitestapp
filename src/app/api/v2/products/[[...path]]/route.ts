export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type {
  CatchAllRouteDefinition as RouteDefinition,
  CatchAllOptionalRoutePatternToken as PatternToken,
  CatchAllRouteHandler as RouteHandler,
  CatchAllRouteMethod as HttpMethod,
  CatchAllRouteModule as RouteModule,
  CatchAllRouteParams as Params,
  CatchAllRoutePathParams as RouteParams,
} from '@/shared/lib/api/catch-all-route-types';
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
import * as productsValidatorPatternsImport from '../validator-patterns/import/route-handler';
import * as productsValidatorPatternsReorder from '../validator-patterns/reorder/route-handler';
import * as productsValidatorPatternsTemplates from '../validator-patterns/templates/[type]/route-handler';
import * as productsValidatorPatternsId from '../validator-patterns/[id]/route-handler';
import * as productsValidatorRuntimeEvaluate from '../validator-runtime/evaluate/route-handler';
import * as productsCategories from '../categories/route-handler';
import * as productsCategoriesTree from '../categories/tree/route-handler';
import * as productsCategoriesBatch from '../categories/batch/route-handler';
import * as productsCategoriesMigrate from '../categories/migrate/route-handler';
import * as productsCategoriesReorder from '../categories/reorder/route-handler';
import * as productsCategoriesId from '../categories/[id]/route-handler';
import * as productsEntitiesCatalogsAssign from '../entities/catalogs/assign/route-handler';
import * as productsEntitiesType from '../entities/[type]/route-handler';
import * as productsEntitiesTypeId from '../entities/[type]/[id]/route-handler';
import * as productsMetadataType from '../metadata/[type]/route-handler';
import * as productsMetadataTypeId from '../metadata/[type]/[id]/route-handler';
import * as productsImagesBase64 from '../images/base64/route-handler';
import * as productsImagesBase64All from '../images/base64/all/route-handler';
import * as productsImagesUpload from '../images/upload/route-handler';
import * as productsImportCsv from '../import/csv/route-handler';
import * as productsAiJobs from '../ai-jobs/route-handler';
import * as productsAiJobsBulk from '../ai-jobs/bulk/route-handler';
import * as productsAiJobsEnqueue from '../ai-jobs/enqueue/route-handler';
import * as productsAiJobsJob from '../ai-jobs/[jobId]/route-handler';
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

const getAllowedMethods = (module: RouteModule): HttpMethod[] =>
  HTTP_METHODS.filter((method) => typeof module[method] === 'function');

const dispatch = async (
  module: RouteModule,
  method: HttpMethod,
  request: NextRequest,
  params?: Params
): Promise<Response> => {
  const handler = module[method];
  if (!handler) {
    const allowed = getAllowedMethods(module);
    return allowed.length > 0
      ? methodNotAllowed(request, allowed, method)
      : notFound(request, method);
  }
  return handler(request, { params: Promise.resolve(params ?? ({} as Params)) });
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

const param = (name: string): PatternToken => ({ param: name });

const normalizeToken = (
  token: PatternToken
): { isParam: boolean; key: string; optional: boolean } => {
  if (typeof token === 'string') {
    return { isParam: false, key: token, optional: false };
  }
  if ('literal' in token) {
    return { isParam: false, key: token.literal, optional: Boolean(token.optional) };
  }
  return { isParam: true, key: token.param, optional: Boolean(token.optional) };
};

const matchPattern = (pattern: PatternToken[], segments: string[]): Params | null => {
  const params: Params = {};
  let segmentIndex = 0;
  for (const token of pattern) {
    const { isParam, key, optional } = normalizeToken(token);

    if (segmentIndex >= segments.length) {
      if (optional) {
        continue;
      }
      return null;
    }

    const currentSegment = segments[segmentIndex];
    if (!currentSegment) {
      return null;
    }

    if (!isParam) {
      if (key !== currentSegment) {
        if (optional) {
          continue;
        }
        return null;
      }
      segmentIndex += 1;
      continue;
    }

    params[key] = currentSegment;
    segmentIndex += 1;
  }

  if (segmentIndex !== segments.length) {
    return null;
  }

  return params;
};

const ROUTES: RouteDefinition[] = [
  { pattern: [], module: productsIndex },
  { pattern: ['count'], module: productsCount },
  { pattern: ['paged'], module: productsPaged },
  { pattern: ['ids'], module: productsIds },
  { pattern: ['simple-parameters'], module: productsSimpleParameters },
  { pattern: ['parameters'], module: productsParameters },
  { pattern: ['parameters', param('id')], module: productsParametersId },
  { pattern: ['producers'], module: productsProducers },
  { pattern: ['producers', param('id')], module: productsProducersId },
  { pattern: ['tags'], module: productsTags },
  { pattern: ['tags', 'all'], module: productsTagsAll },
  { pattern: ['tags', param('id')], module: productsTagsId },
  { pattern: ['validation'], module: productsValidation },
  { pattern: ['validator-config'], module: productsValidatorConfig },
  { pattern: ['validator-decisions'], module: productsValidatorDecisions },
  { pattern: ['validator-settings'], module: productsValidatorSettings },
  { pattern: ['validator-patterns'], module: productsValidatorPatterns },
  { pattern: ['validator-patterns', 'import'], module: productsValidatorPatternsImport },
  { pattern: ['validator-patterns', 'reorder'], module: productsValidatorPatternsReorder },
  { pattern: ['validator-patterns', 'templates', param('type')], module: productsValidatorPatternsTemplates },
  { pattern: ['validator-patterns', param('id')], module: productsValidatorPatternsId },
  { pattern: ['validator-runtime', 'evaluate'], module: productsValidatorRuntimeEvaluate },
  { pattern: ['categories'], module: productsCategories },
  { pattern: ['categories', 'tree'], module: productsCategoriesTree },
  { pattern: ['categories', 'batch'], module: productsCategoriesBatch },
  { pattern: ['categories', 'migrate'], module: productsCategoriesMigrate },
  { pattern: ['categories', 'reorder'], module: productsCategoriesReorder },
  { pattern: ['categories', param('id')], module: productsCategoriesId },
  { pattern: ['entities', 'catalogs', 'assign'], module: productsEntitiesCatalogsAssign },
  { pattern: ['entities', param('type')], module: productsEntitiesType },
  { pattern: ['entities', param('type'), param('id')], module: productsEntitiesTypeId },
  { pattern: ['metadata', param('type')], module: productsMetadataType },
  { pattern: ['metadata', param('type'), param('id')], module: productsMetadataTypeId },
  { pattern: ['images', 'base64'], module: productsImagesBase64 },
  { pattern: ['images', 'base64', 'all'], module: productsImagesBase64All },
  { pattern: ['images', 'upload'], module: productsImagesUpload },
  { pattern: ['import', 'csv'], module: productsImportCsv },
  { pattern: ['ai-jobs'], module: productsAiJobs },
  { pattern: ['ai-jobs', 'bulk'], module: productsAiJobsBulk },
  { pattern: ['ai-jobs', 'enqueue'], module: productsAiJobsEnqueue },
  { pattern: ['ai-jobs', param('jobId')], module: productsAiJobsJob },
  { pattern: ['ai-paths', 'description-context'], module: productsAiPathsDescriptionContext },
  { pattern: ['sync', 'profiles'], module: productsSyncProfiles },
  { pattern: ['sync', 'profiles', param('id')], module: productsSyncProfilesId },
  { pattern: ['sync', 'profiles', param('id'), 'run'], module: productsSyncProfilesRun },
  { pattern: ['sync', 'runs'], module: productsSyncRuns },
  { pattern: ['sync', 'runs', param('runId')], module: productsSyncRunsId },
  { pattern: ['sync', 'relink'], module: productsSyncRelink },
  { pattern: [param('id')], module: productIdRoute },
  { pattern: [param('id'), 'duplicate'], module: productDuplicate },
  { pattern: [param('id'), 'images', 'base64'], module: productImagesBase64 },
  { pattern: [param('id'), 'images', 'link-to-file'], module: productImagesLinkToFile },
  { pattern: [param('id'), 'images', param('imageFileId')], module: productImagesById },
  { pattern: [param('id'), 'studio'], module: productStudio },
  { pattern: [param('id'), 'studio', param('action')], module: productStudioAction },
];

const routeProducts = (
  method: HttpMethod,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  for (const route of ROUTES) {
    const params = matchPattern(route.pattern, segments);
    if (!params) {
      continue;
    }
    return dispatch(route.module, method, request, params);
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
