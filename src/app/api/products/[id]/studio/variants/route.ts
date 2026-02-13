export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getProductStudioVariants } from '@/features/products/services/product-studio-service';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import { idParamSchema } from '@/shared/validations/api-schemas';

async function GET_handler(
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

export const GET = apiHandlerWithParams<{ id: string }>(
  async (
    req: NextRequest,
    ctx: ApiHandlerContext,
    params: { id: string }
  ): Promise<Response> => GET_handler(req, ctx, params),
  {
    source: 'products.[id].studio.variants.GET',
    paramsSchema: idParamSchema,
  }
);
