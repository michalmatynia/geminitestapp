import { NextRequest, NextResponse } from 'next/server';

import { type ProductImageBase64Response } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { buildImageBase64Slots } from '@/shared/lib/products/services/image-base64';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id;
  if (!productId) {
    throw badRequestError('Product id is required');
  }

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
