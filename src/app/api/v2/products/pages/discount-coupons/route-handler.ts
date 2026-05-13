export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  ecommerceDiscountCouponSchema,
  getHandler,
  putHandler,
} from './handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.products.pages.discount-coupons.GET',
  requireAuth: true,
  rateLimitKey: false,
});

export const PUT = apiHandler(putHandler, {
  source: 'v2.products.pages.discount-coupons.PUT',
  requireAuth: true,
  rateLimitKey: false,
  parseJsonBody: true,
  bodySchema: ecommerceDiscountCouponSchema,
});
