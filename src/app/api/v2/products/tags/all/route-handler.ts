export const runtime = 'nodejs';

import { getHandler } from '@/app/api/v2/products/tags/all/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.tags.all.GET',
  requireAuth: true,
});
