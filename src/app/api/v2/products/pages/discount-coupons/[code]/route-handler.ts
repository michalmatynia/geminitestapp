export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { deleteHandler } from './handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const DELETE = apiHandlerWithParams<{ code: string }>(deleteHandler, {
  source: 'v2.products.pages.discount-coupons.[code].DELETE',
  requireAuth: true,
  rateLimitKey: false,
});
