import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  listEcommerceDiscountCoupons,
  saveEcommerceDiscountCoupon,
} from '@/features/integrations/services/ecommerce-discount-coupons';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError } from '@/shared/errors/app-error';

const nullableIsoDateSchema = z
  .string()
  .trim()
  .datetime()
  .nullable();

export const ecommerceDiscountCouponSchema = z.object({
  code: z.string().trim().min(1),
  discountType: z.enum(['fixed', 'percentage']),
  enabled: z.boolean(),
  endsAt: nullableIsoDateSchema,
  minOrderAmount: z.number().finite().min(0).nullable(),
  singleUse: z.boolean(),
  startsAt: nullableIsoDateSchema,
  usageLimit: z.number().int().positive().nullable(),
  value: z.number().finite().positive(),
});

const assertAuthenticated = (ctx: ApiHandlerContext): void => {
  if ((ctx.userId?.trim() ?? '').length === 0) {
    throw authError('Unauthorized.');
  }
};

export async function getHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  assertAuthenticated(ctx);
  return NextResponse.json(
    { ok: true, ...(await listEcommerceDiscountCoupons()) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function putHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  assertAuthenticated(ctx);
  const result = await saveEcommerceDiscountCoupon(
    ctx.body as z.infer<typeof ecommerceDiscountCouponSchema>
  );
  return NextResponse.json(
    { ok: true, ...result },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
