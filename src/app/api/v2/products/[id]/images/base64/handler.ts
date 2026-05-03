import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { type ProductImageBase64Response } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';
import { buildImageBase64Slots } from '@/shared/lib/products/services/image-base64';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Product id is required'),
});

export async function postHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const { id: productId } = parsedParams.data;

  const productRepo = await getProductRepository();
  const product = await productRepo.getProductById(productId);
  if (!product) {
    throw notFoundError('Product not found', { productId });
  }

  const { imageBase64s, imageLinks } = await buildImageBase64Slots(product);
  await productRepo.updateProduct(productId, { imageBase64s, imageLinks });

  const response: ProductImageBase64Response = {
    status: 'ok',
    productId,
    count: imageBase64s.filter(Boolean).length,
  };

  return NextResponse.json(response);
}
