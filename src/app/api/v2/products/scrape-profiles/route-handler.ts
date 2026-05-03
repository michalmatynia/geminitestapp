export const runtime = 'nodejs';

import { getHandler } from '@/app/api/v2/products/scrape-profiles/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.products.scrape-profiles.GET',
  requireAuth: true,
});
