export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  deleteHandler,
  getHandler,
  putHandler,
  updateProfileSchema,
} from '@/app/api/v2/products/sync/profiles/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'v2.products.sync.profiles.[id].GET',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'v2.products.sync.profiles.[id].PUT',
  parseJsonBody: true,
  bodySchema: updateProfileSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'v2.products.sync.profiles.[id].DELETE',
  requireAuth: true,
});
