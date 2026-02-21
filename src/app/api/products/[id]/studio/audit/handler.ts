import { NextRequest, NextResponse } from 'next/server';

import { listProductStudioRunAudit } from '@/features/products/services/product-studio-audit-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id.trim();
  if (!productId) {
    throw badRequestError('Product id is required.');
  }

  const imageSlotIndexRaw = req.nextUrl.searchParams.get('imageSlotIndex');
  const limitRaw = req.nextUrl.searchParams.get('limit');

  const imageSlotIndex =
    typeof imageSlotIndexRaw === 'string' && imageSlotIndexRaw.trim().length > 0
      ? Number.parseInt(imageSlotIndexRaw, 10)
      : null;
  if (imageSlotIndexRaw && !Number.isFinite(imageSlotIndex)) {
    throw badRequestError('imageSlotIndex must be a number.');
  }

  const limit =
    typeof limitRaw === 'string' && limitRaw.trim().length > 0
      ? Number.parseInt(limitRaw, 10)
      : null;
  if (limitRaw && !Number.isFinite(limit)) {
    throw badRequestError('limit must be a number.');
  }

  const entries = await listProductStudioRunAudit({
    productId,
    imageSlotIndex,
    limit,
  });

  return NextResponse.json({ entries });
}

