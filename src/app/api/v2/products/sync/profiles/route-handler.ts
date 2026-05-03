export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  getHandler,
  postHandler,
  createProfileSchema,
} from '@/app/api/v2/products/sync/profiles/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.sync.profiles.GET',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.products.sync.profiles.POST',
  parseJsonBody: true,
  bodySchema: createProfileSchema,
  requireAuth: true,
});
