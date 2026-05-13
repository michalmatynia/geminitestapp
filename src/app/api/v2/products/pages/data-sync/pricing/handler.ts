import { type NextRequest, NextResponse } from 'next/server';

import { syncEcommercePricingFromProductsLocalMongo } from '@/features/integrations/services/ecommerce-pricing-sync';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError } from '@/shared/errors/app-error';

const assertAuthenticated = (ctx: ApiHandlerContext): void => {
  if ((ctx.userId?.trim() ?? '').length === 0) {
    throw authError('Unauthorized.');
  }
};

export async function postHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  assertAuthenticated(ctx);
  const sync = await syncEcommercePricingFromProductsLocalMongo();
  return NextResponse.json(
    { ok: true, sync },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
