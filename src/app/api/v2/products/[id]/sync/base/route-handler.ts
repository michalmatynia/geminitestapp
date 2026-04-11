export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  GET_handler,
  POST_handler,
} from '@/app/api/v2/products/[id]/sync/base/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'v2.products.[id].sync.base.GET',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'v2.products.[id].sync.base.POST',
  requireAuth: true,
});
