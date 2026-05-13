export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getHandler } from '@/app/api/v2/products/runtime-create/[requestId]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const GET = apiHandlerWithParams<{ requestId: string }>(getHandler, {
  source: 'v2.products.runtime-create.[requestId].GET',
  requireAuth: true,
});
