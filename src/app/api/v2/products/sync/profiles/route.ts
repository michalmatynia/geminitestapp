export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  GET_handler,
  POST_handler,
  createProfileSchema,
} from '@/app/api/v2/products/sync/profiles/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(GET_handler, {
  source: 'v2.products.sync.profiles.GET',
  cacheControl: 'no-store',
});

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.sync.profiles.POST',
  parseJsonBody: true,
  bodySchema: createProfileSchema,
});
