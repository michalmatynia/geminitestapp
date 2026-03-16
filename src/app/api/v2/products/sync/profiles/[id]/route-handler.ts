export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  DELETE_handler,
  GET_handler,
  PUT_handler,
  updateProfileSchema,
} from '@/app/api/v2/products/sync/profiles/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'v2.products.sync.profiles.[id].GET',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'v2.products.sync.profiles.[id].PUT',
  parseJsonBody: true,
  bodySchema: updateProfileSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'v2.products.sync.profiles.[id].DELETE',
  requireAuth: true,
});
