export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  DELETE_handler,
  GET_handler,
  PUT_handler,
  updateProfileSchema,
} from '@/app/api/v2/products/sync/profiles/[id]/handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'products.sync.profiles.[id].GET',
  requireCsrf: false,
  cacheControl: 'no-store',
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'products.sync.profiles.[id].PUT',
  parseJsonBody: true,
  bodySchema: updateProfileSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'products.sync.profiles.[id].DELETE',
});
