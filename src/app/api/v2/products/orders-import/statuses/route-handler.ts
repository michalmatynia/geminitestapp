export const runtime = 'nodejs';
export const revalidate = 300;

import { getHandler } from '@/app/api/v2/products/orders-import/statuses/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.products.orders-import.statuses.GET',
  requireAuth: true,
});
