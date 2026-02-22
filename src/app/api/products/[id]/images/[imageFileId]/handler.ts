import { NextRequest } from 'next/server';

import { productService } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

/**
 * DELETE /api/products/[id]/images/[imageFileId]
 * Unlinks an image from a product.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; imageFileId: string }
): Promise<Response> {
  const productId = params.id;
  const imageFileId = params.imageFileId;

  // This should never happen for this route shape, but keep the guard
  if (!productId || !imageFileId) {
    throw badRequestError('Product id and image file id are required', {
      productId,
      imageFileId,
    });
  }

  await productService.deleteProductImage(productId, imageFileId);
  return new Response(null, { status: 204 });
}
