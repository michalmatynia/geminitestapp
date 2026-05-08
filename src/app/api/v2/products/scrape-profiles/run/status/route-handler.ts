export const runtime = 'nodejs';

import { getHandler } from '@/app/api/v2/products/scrape-profiles/run/status/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.products.scrape-profiles.run.status.GET',
  requireAuth: true,
});
