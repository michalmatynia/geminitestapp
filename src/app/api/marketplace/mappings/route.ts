
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'marketplace.mappings.GET',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'marketplace.mappings.POST',
  requireAuth: true,
});
