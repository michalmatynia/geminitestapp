export const runtime = 'nodejs';

import { NextRequest } from 'next/server';

import { productService } from '@/features/products/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

/**
 * DELETE /api/products/[id]/images/[imageFileId]
 * Unlinks an image from a product.
 */
async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; imageFileId: string }): Promise<Response> {
  const productId = params.id;
  const imageFileId = params.imageFileId;

  // This should never happen for this route shape, but keep the guard
  if (!productId || !imageFileId) {
    throw badRequestError('Product id and image file id are required', {
      productId,
      imageFileId,
    });
  }

  await productService.unlinkImageFromProduct(productId, imageFileId);
  return new Response(null, { status: 204 });
}

export const DELETE = apiHandlerWithParams<{ id: string; imageFileId: string }>(DELETE_handler, { source: 'products.[id].images.[imageFileId].DELETE' });
