export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  GET_handler,
  POST_handler,
  createProfileSchema,
} from '@/app/api/v2/products/sync/profiles/handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.sync.profiles.GET',
  requireCsrf: false,
  cacheControl: 'no-store',
});

export const POST = apiHandler(POST_handler, {
  source: 'products.sync.profiles.POST',
  parseJsonBody: true,
  bodySchema: createProfileSchema,
});
