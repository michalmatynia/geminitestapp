
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'marketplace.producer-mappings.GET',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'marketplace.producer-mappings.POST',
  requireAuth: true,
});
