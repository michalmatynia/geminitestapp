export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { GET_handler, querySchema } from '@/app/api/v2/products/sync/runs/[runId]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const GET = apiHandlerWithParams<{ runId: string }>(GET_handler, {
  source: 'v2.products.sync.runs.[runId].GET',
  querySchema,
  cacheControl: 'no-store',
});
