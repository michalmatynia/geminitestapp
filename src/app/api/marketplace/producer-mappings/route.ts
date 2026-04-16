
import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'marketplace.producer-mappings.GET',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'marketplace.producer-mappings.POST',
  requireAuth: true,
});
