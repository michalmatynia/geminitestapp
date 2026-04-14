
import type { NextRequest } from 'next/server';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import {
  handleCatchAllRequest,
  getPathSegments,
  type CatchAllRouteDefinition,
  type CatchAllOptionalRoutePatternToken as PatternToken,
  type CatchAllRoutePathParams as RouteParams,
} from '@/shared/lib/api/catch-all-router';


const param = (name: string): PatternToken => ({ param: name });

const ROUTES: CatchAllRouteDefinition<PatternToken>[] = [
  { pattern: [], loader: () => import('../route-handler') },
  { pattern: ['count'], loader: () => import('../count/route-handler') },
  { pattern: ['paged'], loader: () => import('../paged/route-handler') },
  { pattern: ['ids'], loader: () => import('../ids/route-handler') },
  { pattern: ['simple-parameters'], loader: () => import('../simple-parameters/route-handler') },
  { pattern: ['custom-fields'], loader: () => import('../custom-fields/route-handler') },
  { pattern: ['custom-fields', param('id')], loader: () => import('../custom-fields/[id]/route-handler') },
  { pattern: ['parameters'], loader: () => import('../parameters/route-handler') },
  { pattern: ['parameters', 'batch'], loader: () => import('../parameters/batch/route-handler') },
  { pattern: ['parameters', param('id')], loader: () => import('../parameters/[id]/route-handler') },
  { pattern: ['producers'], loader: () => import('../producers/route-handler') },
  { pattern: ['producers', param('id')], loader: () => import('../producers/[id]/route-handler') },
  { pattern: ['shipping-groups'], loader: () => import('../shipping-groups/route-handler') },
  { pattern: ['shipping-groups', param('id')], loader: () => import('../shipping-groups/[id]/route-handler') },
  { pattern: ['tags'], loader: () => import('../tags/route-handler') },
  { pattern: ['tags', 'all'], loader: () => import('../tags/all/route-handler') },
  { pattern: ['tags', param('id')], loader: () => import('../tags/[id]/route-handler') },
  { pattern: ['validation'], loader: () => import('../validation/route-handler') },
  { pattern: ['validator-config'], loader: () => import('../validator-config/route-handler') },
  { pattern: ['validator-decisions', 'batch'], loader: () => import('../validator-decisions/batch/route-handler') },
  { pattern: ['validator-decisions'], loader: () => import('../validator-decisions/route-handler') },
  { pattern: ['validator-settings'], loader: () => import('../validator-settings/route-handler') },
  { pattern: ['validator-patterns'], loader: () => import('../validator-patterns/route-handler') },
  { pattern: ['validator-patterns', 'import'], loader: () => import('../validator-patterns/import/route-handler') },
  { pattern: ['validator-patterns', 'reorder'], loader: () => import('../validator-patterns/reorder/route-handler') },
  { pattern: ['validator-patterns', 'templates', param('type')], loader: () => import('../validator-patterns/templates/[type]/route-handler') },
  { pattern: ['validator-patterns', param('id')], loader: () => import('../validator-patterns/[id]/route-handler') },
  { pattern: ['validator-runtime', 'evaluate'], loader: () => import('../validator-runtime/evaluate/route-handler') },
  { pattern: ['categories'], loader: () => import('../categories/route-handler') },
  { pattern: ['categories', 'tree'], loader: () => import('../categories/tree/route-handler') },
  { pattern: ['categories', 'batch'], loader: () => import('../categories/batch/route-handler') },
  { pattern: ['categories', 'reorder'], loader: () => import('../categories/reorder/route-handler') },
  { pattern: ['categories', param('id')], loader: () => import('../categories/[id]/route-handler') },
  { pattern: ['entities', 'catalogs', 'assign'], loader: () => import('../entities/catalogs/assign/route-handler') },
  { pattern: ['entities', param('type')], loader: () => import('../entities/[type]/route-handler') },
  { pattern: ['entities', param('type'), param('id')], loader: () => import('../entities/[type]/[id]/route-handler') },
  { pattern: ['metadata', param('type')], loader: () => import('../metadata/[type]/route-handler') },
  { pattern: ['metadata', param('type'), param('id')], loader: () => import('../metadata/[type]/[id]/route-handler') },
  { pattern: ['images', 'base64'], loader: () => import('../images/base64/route-handler') },
  { pattern: ['images', 'base64', 'all'], loader: () => import('../images/base64/all/route-handler') },
  { pattern: ['images', 'upload'], loader: () => import('../images/upload/route-handler') },
  { pattern: ['archive', 'batch'], loader: () => import('../archive/batch/route-handler') },
  { pattern: ['scans', 'latest'], loader: () => import('../scans/latest/route-handler') },
  { pattern: ['scans'], loader: () => import('../scans/route-handler') },
  { pattern: ['scans', param('scanId')], loader: () => import('../scans/[scanId]/route-handler') },
  { pattern: ['scans', '1688', 'batch'], loader: () => import('../scans/1688/batch/route-handler') },
  { pattern: ['scans', 'amazon', 'batch'], loader: () => import('../scans/amazon/batch/route-handler') },
  { pattern: ['import', 'csv'], loader: () => import('../import/csv/route-handler') },
  { pattern: ['title-terms'], loader: () => import('../title-terms/route-handler') },
  { pattern: ['title-terms', param('id')], loader: () => import('../title-terms/[id]/route-handler') },
  { pattern: ['orders-import', 'statuses'], loader: () => import('../orders-import/statuses/route-handler') },
  { pattern: ['orders-import', 'preview'], loader: () => import('../orders-import/preview/route-handler') },
  { pattern: ['orders-import', 'import'], loader: () => import('../orders-import/import/route-handler') },
  { pattern: ['ai-jobs'], loader: () => import('../ai-jobs/route-handler') },
  { pattern: ['ai-jobs', 'bulk'], loader: () => import('../ai-jobs/bulk/route-handler') },
  { pattern: ['ai-jobs', 'enqueue'], loader: () => import('../ai-jobs/enqueue/route-handler') },
  { pattern: ['ai-jobs', param('jobId')], loader: () => import('../ai-jobs/[jobId]/route-handler') },
  { pattern: ['ai-paths', 'description-context'], loader: () => import('../ai-paths/description-context/route-handler') },
  { pattern: ['sync', 'profiles'], loader: () => import('../sync/profiles/route-handler') },
  { pattern: ['sync', 'profiles', param('id')], loader: () => import('../sync/profiles/[id]/route-handler') },
  { pattern: ['sync', 'profiles', param('id'), 'run'], loader: () => import('../sync/profiles/[id]/run/route-handler') },
  { pattern: ['sync', 'runs'], loader: () => import('../sync/runs/route-handler') },
  { pattern: ['sync', 'runs', param('runId')], loader: () => import('../sync/runs/[runId]/route-handler') },
  { pattern: ['sync', 'relink'], loader: () => import('../sync/relink/route-handler') },
  { pattern: [param('id'), 'sync', 'base'], loader: () => import('../[id]/sync/base/route-handler') },
  { pattern: [param('id')], loader: () => import('../[id]/route-handler') },
  { pattern: [param('id'), 'duplicate'], loader: () => import('../[id]/duplicate/route-handler') },
  { pattern: [param('id'), 'images', 'base64'], loader: () => import('../[id]/images/base64/route-handler') },
  { pattern: [param('id'), 'images', 'link-to-file'], loader: () => import('../[id]/images/link-to-file/route-handler') },
  { pattern: [param('id'), 'images', param('imageFileId')], loader: () => import('../[id]/images/[imageFileId]/route-handler') },
  { pattern: [param('id'), 'scans'], loader: () => import('../[id]/scans/route-handler') },
  { pattern: [param('id'), 'studio'], loader: () => import('../[id]/studio/route-handler') },
  { pattern: [param('id'), 'studio', param('action')], loader: () => import('../[id]/studio/[action]/route-handler') },
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
