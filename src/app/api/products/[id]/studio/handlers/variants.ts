import { NextRequest, NextResponse } from 'next/server';

import { getProductStudioVariants } from '@/features/ai/image-studio/product-studio/product-studio-service';
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
  if (!imageSlotIndexRaw) {
    throw badRequestError('imageSlotIndex query param is required.');
  }

  const imageSlotIndex = Number.parseInt(imageSlotIndexRaw, 10);
  if (!Number.isFinite(imageSlotIndex)) {
    throw badRequestError('imageSlotIndex must be a number.');
  }

  const projectId = req.nextUrl.searchParams.get('projectId');

  const result = await getProductStudioVariants({
    productId,
    imageSlotIndex,
    projectId,
  });

  return NextResponse.json(result);
}
