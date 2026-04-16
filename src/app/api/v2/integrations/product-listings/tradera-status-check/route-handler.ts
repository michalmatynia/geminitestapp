import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'v2.integrations.product-listings.tradera-status-check.POST',
  cacheControl: 'no-store',
  requireAuth: true,
  requireCsrf: false,
});
