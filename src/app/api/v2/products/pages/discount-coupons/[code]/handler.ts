import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteEcommerceDiscountCoupon } from '@/features/integrations/services/ecommerce-discount-coupons';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  code: z.string().trim().min(1),
});

const assertAuthenticated = (ctx: ApiHandlerContext): void => {
  if ((ctx.userId?.trim() ?? '').length === 0) {
    throw authError('Unauthorized.');
  }
};

const parseCode = (params: { code?: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters.', {
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data.code;
};

export async function deleteHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { code?: string }
): Promise<NextResponse> {
  assertAuthenticated(ctx);
  const result = await deleteEcommerceDiscountCoupon(parseCode(params));
  return NextResponse.json(
    { ok: true, ...result },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
