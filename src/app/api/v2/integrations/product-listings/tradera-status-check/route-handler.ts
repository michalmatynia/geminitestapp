import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.product-listings.tradera-status-check.POST',
  cacheControl: 'no-store',
  requireAuth: true,
  requireCsrf: false,
});
