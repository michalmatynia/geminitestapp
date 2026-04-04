export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import {
  handleCatchAllRequest,
  getPathSegments,
  type CatchAllRouteDefinition,
  type CatchAllOptionalRoutePatternToken as PatternToken,
  type CatchAllRoutePathParams as RouteParams,
} from '@/shared/lib/api/catch-all-router';

import * as productsIndex from '../route-handler';
import * as productsCount from '../count/route-handler';
import * as productsPaged from '../paged/route-handler';
import * as productsIds from '../ids/route-handler';
import * as productsSimpleParameters from '../simple-parameters/route-handler';
import * as productsParameters from '../parameters/route-handler';
import * as productsParametersId from '../parameters/[id]/route-handler';
import * as productsProducers from '../producers/route-handler';
import * as productsProducersId from '../producers/[id]/route-handler';
import * as productsShippingGroups from '../shipping-groups/route-handler';
import * as productsShippingGroupsId from '../shipping-groups/[id]/route-handler';
import * as productsTags from '../tags/route-handler';
import * as productsTagsAll from '../tags/all/route-handler';
import * as productsTagsId from '../tags/[id]/route-handler';
import * as productsValidation from '../validation/route-handler';
import * as productsValidatorConfig from '../validator-config/route-handler';
import * as productsValidatorDecisions from '../validator-decisions/route-handler';
import * as productsValidatorDecisionsBatch from '../validator-decisions/batch/route-handler';
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
import * as productsOrdersImportStatuses from '../orders-import/statuses/route-handler';
import * as productsOrdersImportPreview from '../orders-import/preview/route-handler';
import * as productsOrdersImportImport from '../orders-import/import/route-handler';
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

const param = (name: string): PatternToken => ({ param: name });

const ROUTES: CatchAllRouteDefinition<PatternToken>[] = [
  { pattern: [], module: productsIndex },
  { pattern: ['count'], module: productsCount },
  { pattern: ['paged'], module: productsPaged },
  { pattern: ['ids'], module: productsIds },
  { pattern: ['simple-parameters'], module: productsSimpleParameters },
  { pattern: ['parameters'], module: productsParameters },
  { pattern: ['parameters', param('id')], module: productsParametersId },
  { pattern: ['producers'], module: productsProducers },
  { pattern: ['producers', param('id')], module: productsProducersId },
  { pattern: ['shipping-groups'], module: productsShippingGroups },
  { pattern: ['shipping-groups', param('id')], module: productsShippingGroupsId },
  { pattern: ['tags'], module: productsTags },
  { pattern: ['tags', 'all'], module: productsTagsAll },
  { pattern: ['tags', param('id')], module: productsTagsId },
  { pattern: ['validation'], module: productsValidation },
  { pattern: ['validator-config'], module: productsValidatorConfig },
  { pattern: ['validator-decisions', 'batch'], module: productsValidatorDecisionsBatch },
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
  { pattern: ['orders-import', 'statuses'], module: productsOrdersImportStatuses },
  { pattern: ['orders-import', 'preview'], module: productsOrdersImportPreview },
  { pattern: ['orders-import', 'import'], module: productsOrdersImportImport },
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

const BASE_PATH = '/api/v2/products';
const SOURCE_BASE = 'v2.products';

export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) =>
    handleCatchAllRequest('GET', request, getPathSegments(request, BASE_PATH), ROUTES, SOURCE_BASE),
  { source: 'v2.products.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) =>
    handleCatchAllRequest('POST', request, getPathSegments(request, BASE_PATH), ROUTES, SOURCE_BASE),
  { source: 'v2.products.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) =>
    handleCatchAllRequest('PUT', request, getPathSegments(request, BASE_PATH), ROUTES, SOURCE_BASE),
  { source: 'v2.products.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) =>
    handleCatchAllRequest('PATCH', request, getPathSegments(request, BASE_PATH), ROUTES, SOURCE_BASE),
  { source: 'v2.products.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) =>
    handleCatchAllRequest('DELETE', request, getPathSegments(request, BASE_PATH), ROUTES, SOURCE_BASE),
  { source: 'v2.products.[[...path]].DELETE', requireAuth: true }
);
