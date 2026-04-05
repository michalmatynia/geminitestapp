import { NextRequest } from 'next/server';
import { z } from 'zod';

import { productService } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Product id is required'),
  imageFileId: z.string().trim().min(1, 'Image file id is required'),
});

/**
 * DELETE /api/v2/products/[id]/images/[imageFileId]
 * Unlinks an image from a product.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; imageFileId: string }
): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const { id: productId, imageFileId } = parsedParams.data;

  await productService.unlinkImageFromProduct(productId, imageFileId);
  return new Response(null, { status: 204 });
}
